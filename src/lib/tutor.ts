import { getPersonality, type Scenario, type ScenarioStep } from "@/content/scenarios";
import type { Conversation, Correction, Difficulty, PersonalityId, SessionSummary, TutorFeedback, TutorMessage, TutorMode } from "./types";
import { normalizeAnswer } from "./scoring";
import { uid } from "./util";

/* ------------------------------------------------------------------ */
/* Offline engine: rule-based hints. It is NOT a complete grammar     */
/* checker — it catches common Portuguese-speaker mistakes only.      */
/* ------------------------------------------------------------------ */

interface Rule {
  pattern: RegExp;
  replace: string;
  explanationPt: string;
}

const RULES: Rule[] = [
  { pattern: /\bi am agree\b/i, replace: "I agree", explanationPt: "“Agree” já é um verbo; não use “am” antes dele." },
  { pattern: /\bme name\b/i, replace: "my name", explanationPt: "O pronome possessivo é “my”, não “me”." },
  { pattern: /\bi have (\d+|\w+) years?( old)?\b/i, replace: "I am $1 years old", explanationPt: "Para idade, use “to be” (I am… years old), não “have”." },
  { pattern: /\b(he|she|it) don't\b/i, replace: "$1 doesn't", explanationPt: "Com he/she/it use “doesn't”, não “don't”." },
  { pattern: /\b(he|she|it) have\b/i, replace: "$1 has", explanationPt: "Com he/she/it use “has”, não “have”." },
  { pattern: /\bi (want|need) go\b/i, replace: "I $1 to go", explanationPt: "Depois de want/need use “to” + verbo: want to go." },
  { pattern: /\bi'am\b/i, replace: "I'm", explanationPt: "A contração correta é “I'm” (sem o “a” extra)." },
  { pattern: /\bmore better\b/i, replace: "better", explanationPt: "“Better” já é comparativo; não use “more”." },
  { pattern: /\bdo you can\b/i, replace: "can you", explanationPt: "“Can” é verbo modal: use “Can you…?”, sem “do”." },
  { pattern: /\bi no (like|know|want|understand|speak|have)\b/i, replace: "I don't $1", explanationPt: "Para negar verbos use “don't”, não “no”." },
  { pattern: /\bwhere you (from|live)\b/i, replace: "where do you $1", explanationPt: "Perguntas precisam de auxiliar: “Where do you live?” / “Where are you from?”." },
  { pattern: /\bmy name are\b/i, replace: "my name is", explanationPt: "“Name” é singular: my name is." },
  { pattern: /\b(i|you|we|they) is\b/i, replace: "$1 are", explanationPt: "Verbo “to be”: I am, you/we/they are." },
  { pattern: /\b(he|she) are\b/i, replace: "$1 is", explanationPt: "Com he/she use “is”." },
  { pattern: /\bi have hunger\b/i, replace: "I am hungry", explanationPt: "Em inglês dizemos “I am hungry”, não “I have hunger”." },
  { pattern: /\bhow much cost\b/i, replace: "how much does it cost", explanationPt: "Faltou o auxiliar: “How much does it cost?”." },
  { pattern: /\bi am work\b/i, replace: "I work", explanationPt: "Use “I work” (hábito) ou “I am working” (agora)." },
  { pattern: /\bdepend of\b/i, replace: "depend on", explanationPt: "A preposição correta é “depend on”." },
  { pattern: /\bi am (\d+) years\b(?! old)/i, replace: "I am $1 years old", explanationPt: "Faltou “old”: I am 25 years old." },
];

export function checkGrammar(text: string): Correction[] {
  const out: Correction[] = [];
  for (const r of RULES) {
    const m = text.match(r.pattern);
    if (m) out.push({ original: m[0], corrected: m[0].replace(r.pattern, r.replace), explanationPt: r.explanationPt });
  }
  // Standalone lowercase "i" (case-sensitive on purpose)
  const lower = text.match(/(^|\s)i(?=\s|$|[,.!?']|’)/);
  if (lower) {
    out.push({
      original: lower[0].trim(),
      corrected: "I",
      explanationPt: "O pronome “I” (eu) é sempre escrito com letra maiúscula.",
    });
  }
  return out;
}

function matchesKeyword(normalized: string, kw: string): boolean {
  const k = normalizeAnswer(kw);
  if (!k) return false;
  const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)${escaped}`).test(normalized);
}

export function isOnTopic(text: string, s: ScenarioStep): boolean {
  const n = normalizeAnswer(text);
  return s.expect.some((kw) => matchesKeyword(n, kw));
}

export function offlineFeedback(userText: string, s: ScenarioStep, personalityId: PersonalityId, turn: number): TutorFeedback {
  const p = getPersonality(personalityId);
  const corrections = checkGrammar(userText);
  const onTopic = isOnTopic(userText, s);
  const words = userText.trim().split(/\s+/).filter(Boolean).length;
  const good = onTopic && corrections.length === 0;
  const alt = s.alternatives.find((a) => normalizeAnswer(a) !== normalizeAnswer(userText));
  return {
    corrections,
    natural: good ? alt : s.model,
    alternatives: s.alternatives,
    tipPt: s.tipPt,
    onTopic,
    praise: good ? (words < 3 ? `${p.praise[turn % p.praise.length]} Try a full sentence next time.` : p.praise[turn % p.praise.length]) : p.nudge,
  };
}

export function fillTutorName(text: string, personalityId: PersonalityId): string {
  return text.replaceAll("{tutor}", getPersonality(personalityId).name);
}

export function openingMessage(scenario: Scenario, personalityId: PersonalityId, difficulty: Difficulty): TutorMessage {
  const s = scenario.steps[0];
  return {
    id: uid(),
    role: "tutor",
    text: fillTutorName(s.tutor, personalityId),
    textPt: fillTutorName(s.tutorPt, personalityId),
    suggestions: difficulty === "beginner" ? s.suggestions : undefined,
    at: new Date().toISOString(),
  };
}

export interface OfflineTurn {
  feedback: TutorFeedback;
  next: TutorMessage;
  done: boolean;
}

/** Offline reply for the learner's `turn`-th message (0-based). */
export function offlineTurn(
  scenario: Scenario,
  turn: number,
  userText: string,
  personalityId: PersonalityId,
  difficulty: Difficulty,
): OfflineTurn {
  const s = scenario.steps[Math.min(turn, scenario.steps.length - 1)];
  const feedback = offlineFeedback(userText, s, personalityId, turn);
  const nextStep = scenario.steps[turn + 1];
  const done = !nextStep;
  const next: TutorMessage = nextStep
    ? {
        id: uid(),
        role: "tutor",
        text: fillTutorName(nextStep.tutor, personalityId),
        textPt: fillTutorName(nextStep.tutorPt, personalityId),
        suggestions: difficulty === "beginner" ? nextStep.suggestions : undefined,
        at: new Date().toISOString(),
      }
    : { id: uid(), role: "tutor", text: scenario.closing.en, textPt: scenario.closing.pt, at: new Date().toISOString() };
  return { feedback, next, done };
}

export function buildSummary(messages: TutorMessage[], scenario: Scenario): SessionSummary {
  const userMsgs = messages.filter((m) => m.role === "user");
  const corrections = userMsgs.flatMap((m) => m.feedback?.corrections ?? []);
  const onTopicCount = userMsgs.filter((m) => m.feedback?.onTopic).length;
  const phrases = [
    ...new Set(userMsgs.map((m) => m.feedback?.natural).filter((x): x is string => Boolean(x))),
  ].slice(0, 5);
  const turns = userMsgs.length;
  const text =
    turns === 0
      ? `Session started in “${scenario.title}” but no replies were sent.`
      : `You sent ${turns} ${turns === 1 ? "reply" : "replies"} in “${scenario.title}”; ${onTopicCount} stayed on topic and ${corrections.length} grammar ${corrections.length === 1 ? "note was" : "notes were"} suggested. Review the saved phrases below and try the scenario again to practise them. Feedback is learning assistance, not a formal assessment.`;
  return { turns, correctionCount: corrections.length, onTopicCount, highlights: corrections.slice(0, 5), phrases, text };
}

/* ------------------------------------------------------------------ */
/* Provider-independent client: offline ↔ Ollama ↔ external adapter    */
/* ------------------------------------------------------------------ */

export interface AiTutorReply {
  reply: string;
  replyPt: string;
  corrections: Correction[];
  natural: string;
  tipPt: string;
  suggestions: string[];
}

export class TutorProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TutorProviderError";
  }
}

export interface ProviderStatus {
  available: boolean;
  configured: boolean;
  message: string;
  model?: string;
}

export async function fetchProviderStatus(mode: Exclude<TutorMode, "offline">): Promise<ProviderStatus> {
  try {
    const res = await fetch(`/api/tutor?provider=${mode}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as ProviderStatus;
  } catch {
    return { available: false, configured: false, message: "Could not reach the tutor service." };
  }
}

export async function askAiTutor(args: {
  mode: Exclude<TutorMode, "offline">;
  scenarioId: string;
  personality: PersonalityId;
  difficulty: Difficulty;
  history: { role: "tutor" | "user"; text: string }[];
}): Promise<AiTutorReply> {
  let res: Response;
  try {
    res = await fetch("/api/tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: args.mode,
        scenarioId: args.scenarioId,
        personality: args.personality,
        difficulty: args.difficulty,
        history: args.history.slice(-12),
      }),
    });
  } catch {
    throw new TutorProviderError("Could not reach the tutor service. Check your connection.");
  }
  const body = (await res.json().catch(() => null)) as { error?: string; result?: AiTutorReply } | null;
  if (!res.ok || !body?.result) throw new TutorProviderError(body?.error ?? `The AI provider returned an error (HTTP ${res.status}).`);
  return body.result;
}

export function aiToFeedback(r: AiTutorReply): TutorFeedback {
  return {
    corrections: r.corrections,
    natural: r.natural || undefined,
    alternatives: [],
    tipPt: r.tipPt || undefined,
    onTopic: true,
    praise: r.corrections.length === 0 ? "Nice — no corrections needed." : "Here are some notes:",
  };
}

export function newConversation(
  scenarioId: string,
  personality: PersonalityId,
  difficulty: Difficulty,
  mode: TutorMode,
  opening: TutorMessage,
): Conversation {
  return {
    id: uid(),
    scenarioId,
    personality,
    difficulty,
    mode,
    startedAt: new Date().toISOString(),
    messages: [opening],
  };
}
