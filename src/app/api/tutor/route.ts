import { NextResponse } from "next/server";
import { getPersonality, getScenario, PERSONALITIES, SCENARIOS } from "@/content/scenarios";

export const dynamic = "force-dynamic";

/**
 * Server-side tutor adapter. Credentials and endpoints live in environment
 * variables and never reach the browser.
 *
 *  Ollama:    OLLAMA_BASE_URL (default http://127.0.0.1:11434), OLLAMA_MODEL (default llama3.2)
 *  External:  AI_API_BASE_URL (OpenAI-compatible, e.g. https://api.openai.com/v1), AI_API_KEY, AI_MODEL
 */

type Provider = "ollama" | "external";

const OLLAMA_URL = () => (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
const OLLAMA_MODEL = () => process.env.OLLAMA_MODEL || "llama3.2";

interface Body {
  provider?: unknown;
  scenarioId?: unknown;
  personality?: unknown;
  difficulty?: unknown;
  history?: unknown;
}

const isProvider = (v: unknown): v is Provider => v === "ollama" || v === "external";
const requestWindows = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 10 * 60_000;
const RATE_LIMIT = 20;
const MAX_BODY_BYTES = 16 * 1024;

function takeRateLimit(req: Request, now = Date.now()): boolean {
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const current = requestWindows.get(ip);
  if (!current || current.resetAt <= now) {
    requestWindows.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    if (requestWindows.size > 2_000) {
      for (const [key, value] of requestWindows) if (value.resetAt <= now) requestWindows.delete(key);
    }
    return true;
  }
  if (current.count >= RATE_LIMIT) return false;
  current.count += 1;
  return true;
}

export async function GET(req: Request) {
  const provider = new URL(req.url).searchParams.get("provider");
  if (!isProvider(provider)) return NextResponse.json({ available: false, configured: false, message: "Unknown provider." }, { status: 400 });

  if (provider === "ollama") {
    try {
      const res = await fetch(`${OLLAMA_URL()}/api/tags`, { signal: AbortSignal.timeout(2500), cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as { models?: { name: string }[] };
      const names = (json.models ?? []).map((m) => m.name);
      const wanted = OLLAMA_MODEL();
      const hasModel = names.some((n) => n === wanted || n.startsWith(`${wanted}:`));
      return NextResponse.json({
        available: hasModel,
        configured: true,
        model: wanted,
        message: hasModel
          ? `Ollama is running with model “${wanted}”.`
          : `Ollama is running but model “${wanted}” is not installed. Run: ollama pull ${wanted}`,
      });
    } catch {
      return NextResponse.json({
        available: false,
        configured: true,
        message: "Ollama is not reachable. Start it with “ollama serve” on the machine that runs this app (it will not work on Vercel).",
      });
    }
  }

  const configured = Boolean(process.env.AI_API_BASE_URL && process.env.AI_API_KEY && process.env.AI_MODEL);
  return NextResponse.json({
    available: configured,
    configured,
    model: configured ? process.env.AI_MODEL : undefined,
    message: configured
      ? "External provider is configured. Your tutor messages are sent to that provider when you use this mode."
      : "Set AI_API_BASE_URL, AI_API_KEY and AI_MODEL on the server to enable this mode.",
  });
}

function systemPrompt(scenarioId: string, personalityId: string, difficulty: string): string {
  const scenario = getScenario(scenarioId);
  const p = getPersonality(personalityId as "friendly");
  const level =
    difficulty === "beginner"
      ? "The learner is a Brazilian Portuguese speaker at A1-A2. Use very simple English, short sentences, and keep replies under 25 words."
      : difficulty === "intermediate"
        ? "The learner is a Brazilian Portuguese speaker at around B1. Use natural everyday English, replies under 40 words."
        : "The learner is an advanced Brazilian Portuguese speaker. Use natural, idiomatic English, replies under 60 words.";
  return [
    `You are ${p.name}, an English conversation tutor. Personality: ${p.description}`,
    `Role-play scenario: ${scenario ? `${scenario.title} — ${scenario.description}` : "everyday conversation"}.`,
    level,
    "Stay in the role-play and ask exactly one follow-up question per turn.",
    "Review ONLY the learner's most recent message: list real grammar or vocabulary mistakes and give one more natural alternative.",
    "Explanations must be short and written in Brazilian Portuguese. Never invent mistakes; return an empty corrections array if the message is fine.",
    "Respond ONLY with a JSON object with exactly these keys:",
    '{"reply": string (English), "replyPt": string (Portuguese translation of reply), "corrections": [{"original": string, "corrected": string, "explanationPt": string}], "natural": string (a more natural way to say the learner\'s message), "tipPt": string (one short tip in Portuguese), "suggestions": string[] (up to 3 short English replies the learner could send next)}',
  ].join("\n");
}

function extractJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

const str = (v: unknown, max = 600): string => (typeof v === "string" ? v.slice(0, max) : "");

function sanitize(raw: unknown) {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const reply = str(r.reply);
  if (!reply) return null;
  const corrections = Array.isArray(r.corrections)
    ? r.corrections
        .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
        .slice(0, 5)
        .map((c) => ({ original: str(c.original, 200), corrected: str(c.corrected, 200), explanationPt: str(c.explanationPt, 300) }))
        .filter((c) => c.original && c.corrected)
    : [];
  const suggestions = Array.isArray(r.suggestions) ? r.suggestions.map((s) => str(s, 120)).filter(Boolean).slice(0, 3) : [];
  return { reply, replyPt: str(r.replyPt), corrections, natural: str(r.natural, 300), tipPt: str(r.tipPt, 300), suggestions };
}

export async function POST(req: Request) {
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  if (!takeRateLimit(req)) return NextResponse.json({ error: "Too many tutor requests. Please wait a few minutes and try again." }, { status: 429, headers: { "Retry-After": "600" } });

  let body: Body;
  try {
    const raw = await req.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    body = JSON.parse(raw) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!isProvider(body.provider)) return NextResponse.json({ error: "Unknown provider." }, { status: 400 });
  if (typeof body.scenarioId !== "string" || !SCENARIOS.some((scenario) => scenario.id === body.scenarioId)) {
    return NextResponse.json({ error: "Unknown conversation scenario." }, { status: 400 });
  }
  if (typeof body.personality !== "string" || !PERSONALITIES.some((personality) => personality.id === body.personality)) {
    return NextResponse.json({ error: "Unknown tutor personality." }, { status: 400 });
  }
  if (body.difficulty !== "beginner" && body.difficulty !== "intermediate" && body.difficulty !== "advanced") {
    return NextResponse.json({ error: "Unknown tutor difficulty." }, { status: 400 });
  }
  if (!Array.isArray(body.history) || body.history.length === 0 || body.history.length > 12) {
    return NextResponse.json({ error: "Conversation history must contain between 1 and 12 messages." }, { status: 400 });
  }
  const validHistory = body.history.every(
    (m) => typeof m === "object" && m !== null && ((m as { role?: unknown }).role === "user" || (m as { role?: unknown }).role === "assistant") && typeof (m as { text?: unknown }).text === "string" && (m as { text: string }).text.length > 0 && (m as { text: string }).text.length <= 500,
  );
  if (!validHistory) return NextResponse.json({ error: "Each message must have a valid role and contain 1 to 500 characters." }, { status: 400 });
  const history = body.history.map((m) => ({
    role: (m as { role: "user" | "assistant" }).role,
    content: (m as { text: string }).text,
  }));
  if (history[history.length - 1].role !== "user") {
    return NextResponse.json({ error: "The last message must come from the learner." }, { status: 400 });
  }

  const messages = [{ role: "system", content: systemPrompt(body.scenarioId, body.personality, body.difficulty) }, ...history];

  try {
    let content = "";
    if (body.provider === "ollama") {
      const res = await fetch(`${OLLAMA_URL()}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: OLLAMA_MODEL(), messages, stream: false, format: "json", options: { temperature: 0.6 } }),
        signal: AbortSignal.timeout(90_000),
      });
      if (!res.ok) return NextResponse.json({ error: `Ollama returned an error (${res.status}).` }, { status: 502 });
      const json = (await res.json()) as { message?: { content?: string } };
      content = json.message?.content ?? "";
    } else {
      const base = process.env.AI_API_BASE_URL;
      const key = process.env.AI_API_KEY;
      const model = process.env.AI_MODEL;
      if (!base || !key || !model) {
        return NextResponse.json({ error: "The external AI provider is not configured on the server." }, { status: 503 });
      }
      const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, messages, temperature: 0.6 }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) return NextResponse.json({ error: `The external provider returned an error (${res.status}).` }, { status: 502 });
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      content = json.choices?.[0]?.message?.content ?? "";
    }
    const result = sanitize(extractJson(content));
    if (!result) return NextResponse.json({ error: "The AI answered in an unexpected format. Try again or continue offline." }, { status: 502 });
    return NextResponse.json({ result });
  } catch (e) {
    const timeout = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    return NextResponse.json(
      { error: timeout ? "The AI took too long to answer." : body.provider === "ollama" ? "Could not reach Ollama. Is it running?" : "Could not reach the external provider." },
      { status: 504 },
    );
  }
}
