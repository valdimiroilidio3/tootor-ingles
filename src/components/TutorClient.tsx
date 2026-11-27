"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookmarkPlus, Eye, Lightbulb, Loader2, Play, Send, Square } from "lucide-react";
import { useReadyApp } from "./AppProvider";
import { Mascot } from "./Mascot";
import { SpeakButton, SpeechInput } from "./Speech";
import { Button, Card, EmptyState, Notice, PageHeader, Pill, SectionTitle } from "./ui";
import { getPersonality, getScenario, PERSONALITIES, SCENARIOS, type Scenario } from "@/content/scenarios";
import { aiToFeedback, askAiTutor, buildSummary, fetchProviderStatus, newConversation, offlineTurn, openingMessage, TutorProviderError, type ProviderStatus } from "@/lib/tutor";
import type { Conversation, Difficulty, PersonalityId, TutorFeedback, TutorMessage, TutorMode } from "@/lib/types";
import { cn, formatDate, uid } from "@/lib/util";

const DIFFS: { id: Difficulty; label: string; hint: string }[] = [
  { id: "beginner", label: "Beginner", hint: "Suggested replies + Portuguese support" },
  { id: "intermediate", label: "Intermediate", hint: "Hints on request" },
  { id: "advanced", label: "Advanced", hint: "No suggestions" },
];
const MODES: { id: TutorMode; label: string }[] = [
  { id: "offline", label: "Offline" },
  { id: "ollama", label: "Local AI (Ollama)" },
  { id: "external", label: "External API" },
];

export function TutorClient() {
  const params = useSearchParams();
  const { data, settings, saveSettings, saveConversation, addVocab, recordActivity } = useReadyApp();

  const [scenarioId, setScenarioId] = useState<string>(() => {
    const q = params.get("scenario");
    return q && getScenario(q) ? q : SCENARIOS[0].id;
  });
  const [personality, setPersonality] = useState<PersonalityId>(settings.tutorPersonality);
  const [difficulty, setDifficulty] = useState<Difficulty>(settings.tutorDifficulty);
  const [mode, setMode] = useState<TutorMode>(settings.tutorMode);
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [checking, setChecking] = useState(false);

  const [conv, setConv] = useState<Conversation | null>(null);
  const [view, setView] = useState<"setup" | "chat" | "summary">("setup");
  const [busy, setBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [showPt, setShowPt] = useState(difficulty === "beginner");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const scenario = getScenario(conv?.scenarioId ?? scenarioId) ?? SCENARIOS[0];

  useEffect(() => {
    if (mode === "offline") {
      setStatus(null);
      return;
    }
    let cancelled = false;
    setChecking(true);
    void fetchProviderStatus(mode).then((s) => {
      if (!cancelled) {
        setStatus(s);
        setChecking(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    const behavior: ScrollBehavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    endRef.current?.scrollIntoView({ behavior, block: "end" });
  }, [conv?.messages.length, busy]);

  const history = useMemo(
    () => [...data.conversations].sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    [data.conversations],
  );

  const persist = (c: Conversation) => {
    setConv(c);
    void saveConversation(c);
  };

  const start = () => {
    void saveSettings({ tutorPersonality: personality, tutorDifficulty: difficulty, tutorMode: mode });
    const sc = getScenario(scenarioId) ?? SCENARIOS[0];
    const c = newConversation(sc.id, personality, difficulty, mode, openingMessage(sc, personality, difficulty));
    setAiError(null);
    setShowHints(false);
    setShowPt(difficulty === "beginner");
    setSavedMsg(null);
    persist(c);
    setView("chat");
  };

  const resume = (c: Conversation) => {
    setConv(c);
    setScenarioId(c.scenarioId);
    setShowPt(c.difficulty === "beginner");
    setAiError(null);
    setView(c.endedAt ? "summary" : "chat");
  };

  /** Applies the scripted engine to the last learner text. */
  const applyOffline = (base: Conversation, text: string): Conversation => {
    const sc = getScenario(base.scenarioId) ?? SCENARIOS[0];
    const turn = base.messages.filter((m) => m.role === "user").length;
    const t = offlineTurn(sc, turn, text, base.personality, base.difficulty);
    const userMsg: TutorMessage = { id: uid(), role: "user", text, feedback: t.feedback, at: new Date().toISOString() };
    return { ...base, messages: [...base.messages, userMsg, t.next] };
  };

  const runAi = async (base: Conversation) => {
    setBusy(true);
    setAiError(null);
    try {
      const reply = await askAiTutor({
        mode: base.mode === "external" ? "external" : "ollama",
        scenarioId: base.scenarioId,
        personality: base.personality,
        difficulty: base.difficulty,
        history: base.messages.map((m) => ({ role: m.role, text: m.text })),
      });
      const msgs = [...base.messages];
      const lastUser = msgs.length - 1;
      msgs[lastUser] = { ...msgs[lastUser], feedback: aiToFeedback(reply) };
      msgs.push({ id: uid(), role: "tutor", text: reply.reply, textPt: reply.replyPt || undefined, suggestions: base.difficulty === "beginner" ? reply.suggestions : undefined, at: new Date().toISOString() });
      persist({ ...base, messages: msgs });
    } catch (e) {
      setAiError(e instanceof TutorProviderError ? e.message : "The AI tutor failed unexpectedly.");
    } finally {
      setBusy(false);
    }
  };

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || !conv || busy || conv.endedAt) return;
    setShowHints(false);
    if (conv.mode === "offline") {
      persist(applyOffline(conv, text));
    } else {
      const userMsg: TutorMessage = { id: uid(), role: "user", text, at: new Date().toISOString() };
      const next = { ...conv, messages: [...conv.messages, userMsg] };
      persist(next);
      await runAi(next);
    }
  };

  const continueOffline = () => {
    if (!conv) return;
    const last = conv.messages[conv.messages.length - 1];
    if (last?.role !== "user") return;
    const base: Conversation = { ...conv, mode: "offline", fellBackToOffline: true, messages: conv.messages.slice(0, -1) };
    setAiError(null);
    persist(applyOffline(base, last.text));
  };

  const end = async () => {
    if (!conv) return;
    const summary = buildSummary(conv.messages, scenario);
    const done: Conversation = { ...conv, endedAt: new Date().toISOString(), summary };
    persist(done);
    if (summary.turns >= 3) {
      const seconds = Math.min(30 * 60, (Date.now() - new Date(conv.startedAt).getTime()) / 1000);
      await recordActivity({ kind: "tutor", xp: 10, seconds, refId: conv.scenarioId, dedupeKey: `tutor-${conv.scenarioId}` });
    }
    setView("summary");
  };

  const savePhrases = async (sc: Scenario) => {
    let n = 0;
    for (const p of sc.phrases) if (await addVocab({ word: p.en, translation: p.pt, context: sc.title }, "tutor")) n++;
    setSavedMsg(n > 0 ? `Saved ${n} new ${n === 1 ? "phrase" : "phrases"} to your vocabulary.` : "These phrases are already in your vocabulary.");
  };

  /* ---------------------------- Setup ---------------------------- */
  if (view === "setup") {
    const unavailable = mode !== "offline" && status && !status.available;
    return (
      <div className="space-y-8">
        <PageHeader title="Tutor" subtitle="Practise real conversations. Offline mode uses structured dialogues and works without any AI service." />

        <section aria-label="Choose a scenario">
          <SectionTitle>1 · Scenario</SectionTitle>
          <div role="radiogroup" aria-label="Scenario" className="grid gap-3 sm:grid-cols-2">
            {SCENARIOS.map((s) => (
              <button key={s.id} role="radio" aria-checked={scenarioId === s.id} onClick={() => setScenarioId(s.id)} className={cn("flex items-center gap-3 rounded-2xl border-2 border-b-4 bg-white p-4 text-left transition-all", scenarioId === s.id ? "border-ink bg-brand-soft" : "border-line hover:bg-cream")}>
                <span className="text-3xl" aria-hidden>{s.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold">{s.title}</span>
                  <span className="block truncate text-sm text-muted">{s.description}</span>
                </span>
                <Pill>{s.level}</Pill>
              </button>
            ))}
          </div>
        </section>

        <section aria-label="Tutor personality">
          <SectionTitle>2 · Tutor personality</SectionTitle>
          <div role="radiogroup" aria-label="Personality" className="grid gap-3 sm:grid-cols-3">
            {PERSONALITIES.map((p) => (
              <button key={p.id} role="radio" aria-checked={personality === p.id} onClick={() => setPersonality(p.id)} className={cn("rounded-2xl border-2 border-b-4 bg-white p-4 text-left transition-all", personality === p.id ? "border-ink bg-brand-soft" : "border-line hover:bg-cream")}>
                <span className="block font-extrabold">{p.name}</span>
                <span className="block text-sm font-bold text-muted">{p.label}</span>
                <span className="mt-1 block text-sm text-muted">{p.description}</span>
              </button>
            ))}
          </div>
        </section>

        <section aria-label="Difficulty">
          <SectionTitle>3 · Learner difficulty</SectionTitle>
          <div role="radiogroup" aria-label="Difficulty" className="grid gap-3 sm:grid-cols-3">
            {DIFFS.map((d) => (
              <button key={d.id} role="radio" aria-checked={difficulty === d.id} onClick={() => setDifficulty(d.id)} className={cn("rounded-2xl border-2 border-b-4 bg-white p-4 text-left transition-all", difficulty === d.id ? "border-ink bg-brand-soft" : "border-line hover:bg-cream")}>
                <span className="block font-extrabold">{d.label}</span>
                <span className="text-sm text-muted">{d.hint}</span>
              </button>
            ))}
          </div>
        </section>

        <section aria-label="Engine">
          <SectionTitle>4 · Engine</SectionTitle>
          <div role="radiogroup" aria-label="Tutor engine" className="flex flex-wrap gap-2">
            {MODES.map((m) => (
              <button key={m.id} role="radio" aria-checked={mode === m.id} onClick={() => setMode(m.id)} className={cn("rounded-full border px-4 py-2 text-sm font-bold", mode === m.id ? "border-ink bg-ink text-white" : "border-line bg-white hover:bg-cream")}>
                {m.label}
              </button>
            ))}
          </div>
          <div className="mt-3">
            {mode === "offline" ? (
              <p className="text-sm text-muted">Scripted role-play with rule-based hints — no internet or AI needed. Corrections cover common mistakes only.</p>
            ) : (
              <Notice tone={status?.available ? "info" : "warning"} title={checking ? "Checking provider…" : status?.available ? "Provider ready" : "Provider not available"}>
                {checking ? "Contacting the server…" : status?.message}
                {unavailable && " You can start anyway and continue offline, or switch to Offline above."}
              </Notice>
            )}
            {mode === "external" && <p className="mt-2 text-sm text-muted">Privacy: your messages will be sent via the server to your configured provider.</p>}
          </div>
        </section>

        <Button size="lg" onClick={start} className="w-full sm:w-auto"><Play className="size-5" aria-hidden /> Start conversation</Button>

        <section aria-label="History">
          <SectionTitle>Conversation history</SectionTitle>
          {history.length === 0 ? (
            <EmptyState icon="💬" title="No conversations yet" text="Your sessions and summaries will be saved here on this device." />
          ) : (
            <ul className="grid gap-3">
              {history.slice(0, 12).map((c) => {
                const sc = getScenario(c.scenarioId);
                return (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-4">
                    <span className="text-2xl" aria-hidden>{sc?.emoji ?? "💬"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold">{sc?.title ?? c.scenarioId}</p>
                      <p className="text-xs text-muted">
                        {formatDate(c.startedAt)} · {getPersonality(c.personality).name} · {c.messages.filter((m) => m.role === "user").length} replies · {c.mode}{c.fellBackToOffline ? " → offline" : ""}
                      </p>
                      {c.summary && <p className="mt-1 text-sm text-muted">{c.summary.text}</p>}
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => resume(c)}>{c.endedAt ? "View" : "Resume"}</Button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    );
  }

  if (!conv) return null;

  /* ---------------------------- Summary ---------------------------- */
  if (view === "summary") {
    const sm = conv.summary ?? buildSummary(conv.messages, scenario);
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <Mascot mood="cheer" size={120} />
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Session summary</h1>
          <p className="text-muted">{scenario.emoji} {scenario.title} · {getPersonality(conv.personality).name}</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Card className="p-4"><p className="text-2xl font-extrabold">{sm.turns}</p><p className="text-xs text-muted">replies</p></Card>
          <Card className="p-4"><p className="text-2xl font-extrabold">{sm.onTopicCount}</p><p className="text-xs text-muted">on topic</p></Card>
          <Card className="p-4"><p className="text-2xl font-extrabold">{sm.correctionCount}</p><p className="text-xs text-muted">grammar notes</p></Card>
        </div>
        <Card><p className="text-[15px]">{sm.text}</p></Card>
        {sm.highlights.length > 0 && (
          <section>
            <SectionTitle>Corrections to remember</SectionTitle>
            <ul className="grid gap-3">
              {sm.highlights.map((c, i) => (
                <li key={i} className="rounded-2xl border border-line bg-white p-4 text-sm">
                  <p><span className="font-bold text-danger line-through">{c.original}</span> → <span className="font-bold text-[#1d6b3c]">{c.corrected}</span></p>
                  <p className="mt-1 text-muted">{c.explanationPt}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
        {sm.phrases.length > 0 && (
          <section>
            <SectionTitle>More natural phrases</SectionTitle>
            <ul className="grid gap-2">
              {sm.phrases.map((p) => (
                <li key={p} className="flex items-center gap-2 rounded-2xl bg-white p-3"><SpeakButton text={p} size="sm" /> <span className="font-semibold">{p}</span></li>
              ))}
            </ul>
          </section>
        )}
        {savedMsg && <p role="status" className="rounded-2xl bg-success-soft p-3 text-sm font-bold text-[#1d6b3c]">{savedMsg}</p>}
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => void savePhrases(scenario)}><BookmarkPlus className="size-4" aria-hidden /> Save key phrases to vocabulary</Button>
          <Button onClick={() => { setConv(null); setView("setup"); }}>New conversation</Button>
        </div>
        <details className="rounded-2xl border border-line bg-white p-4">
          <summary className="cursor-pointer font-bold">Full transcript</summary>
          <ul className="mt-3 space-y-2 text-sm">
            {conv.messages.map((m) => (
              <li key={m.id}><b>{m.role === "user" ? "You" : getPersonality(conv.personality).name}:</b> {m.text}</li>
            ))}
          </ul>
        </details>
        <p className="text-xs text-muted">Feedback is learning assistance, not a guaranteed linguistic or pronunciation assessment.</p>
      </div>
    );
  }

  /* ---------------------------- Chat ---------------------------- */
  const p = getPersonality(conv.personality);
  const userTurns = conv.messages.filter((m) => m.role === "user").length;
  const lastMsg = conv.messages[conv.messages.length - 1];
  const scripted = conv.mode === "offline";
  const scriptDone = scripted && userTurns >= scenario.steps.length;
  const currentSuggestions = lastMsg?.role === "tutor" ? (lastMsg.suggestions ?? (scripted ? scenario.steps[Math.min(userTurns, scenario.steps.length - 1)].suggestions : [])) : [];
  const showChips = !scriptDone && lastMsg?.role === "tutor" && currentSuggestions.length > 0 && (conv.difficulty === "beginner" || showHints);

  return (
    <div className="mx-auto flex max-w-2xl flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="text-3xl" aria-hidden>{scenario.emoji}</span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold leading-tight">{scenario.title}</h1>
          <p className="text-xs text-muted">{p.name} · {conv.difficulty} · {conv.mode === "offline" ? "offline mode" : `${conv.mode} AI`}{conv.fellBackToOffline ? " (switched to offline)" : ""}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setShowPt((v) => !v)} aria-pressed={showPt}><Eye className="size-4" aria-hidden /> PT</Button>
        <Button size="sm" variant="dark" onClick={() => void end()}><Square className="size-3.5" aria-hidden /> End & summarise</Button>
      </div>

      <ul className="space-y-4" aria-live="polite" aria-label="Conversation">
        {conv.messages.map((m) => (
          <li key={m.id}>
            {m.role === "tutor" ? (
              <div className="flex items-start gap-2">
                <div className="mt-1 shrink-0"><Mascot size={36} float={false} mood="happy" /></div>
                <div className="max-w-[85%] rounded-3xl rounded-tl-lg bg-white px-4 py-3 shadow-soft">
                  <p className="mb-0.5 text-[11px] font-extrabold uppercase tracking-wide text-muted">{p.name}</p>
                  <p className="text-[16px] font-semibold">{m.text}</p>
                  {showPt && m.textPt && <p className="mt-1 text-sm text-muted">{m.textPt}</p>}
                  <div className="mt-2 flex gap-1.5"><SpeakButton text={m.text} size="sm" /><SpeakButton text={m.text} slow size="sm" /></div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-end gap-2">
                <div className="max-w-[85%] rounded-3xl rounded-tr-lg bg-brand px-4 py-3 font-semibold">{m.text}</div>
                {m.feedback && <FeedbackCard fb={m.feedback} showPt={showPt} />}
              </div>
            )}
          </li>
        ))}
        {busy && (
          <li className="flex items-center gap-2 text-sm text-muted"><Loader2 className="size-4 animate-spin" aria-hidden /> {p.name} is thinking…</li>
        )}
      </ul>

      {aiError && (
        <div className="mt-4">
          <Notice tone="danger" title="The AI tutor isn't responding" action={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => conv && void runAi(conv)}>Try again</Button>
              <Button size="sm" onClick={continueOffline}>Continue with offline tutor</Button>
            </div>
          }>
            {aiError}
          </Notice>
        </div>
      )}

      <div ref={endRef} />

      <div className="sticky bottom-20 mt-6 space-y-3 rounded-3xl border border-line bg-cream/95 p-3 backdrop-blur md:bottom-4">
        {scriptDone ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-bold">Scenario complete — nice work! 🎉</p>
            <Button onClick={() => void end()}>See summary</Button>
          </div>
        ) : (
          <>
            {showChips && (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Suggested replies">
                {currentSuggestions.map((s) => (
                  <button key={s} disabled={busy} onClick={() => void send(s)} className="rounded-full border border-ink/20 bg-white px-3 py-1.5 text-sm font-bold hover:bg-brand-soft disabled:opacity-50">{s}</button>
                ))}
              </div>
            )}
            {!showChips && conv.difficulty !== "beginner" && currentSuggestions.length > 0 && !scriptDone && (
              <button onClick={() => setShowHints(true)} className="flex items-center gap-1.5 text-sm font-bold underline"><Lightbulb className="size-4" aria-hidden /> Need a hint?</button>
            )}
            <SpeechInput onSubmit={(t) => void send(t)} placeholder="Reply in English…" submitLabel="Send" disabled={busy} clearOnSubmit />
            <p className="flex items-center gap-1 text-[11px] text-muted"><Send className="size-3" aria-hidden /> Speak or type. Speech recognition is optional and may not be available in your browser.</p>
          </>
        )}
      </div>
    </div>
  );
}

function FeedbackCard({ fb, showPt }: { fb: TutorFeedback; showPt: boolean }) {
  return (
    <div className="max-w-[92%] rounded-2xl border border-line bg-white p-3 text-sm shadow-soft">
      {fb.praise && <p className="font-extrabold">{fb.praise}</p>}
      {fb.corrections.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {fb.corrections.map((c, i) => (
            <li key={i}>
              <span className="font-bold text-danger line-through">{c.original}</span> → <span className="font-bold text-[#1d6b3c]">{c.corrected}</span>
              {c.explanationPt && <span className="block text-muted">{c.explanationPt}</span>}
            </li>
          ))}
        </ul>
      )}
      {fb.natural && (
        <p className="mt-2 flex items-start gap-2">
          <SpeakButton text={fb.natural} size="sm" label="Play the natural version" />
          <span><span className="block text-xs font-bold uppercase tracking-wide text-muted">More natural</span><span className="font-semibold">{fb.natural}</span></span>
        </p>
      )}
      {!fb.onTopic && <p className="mt-2 text-muted">Your reply didn&apos;t match the question much — compare it with the example above.</p>}
      {showPt && fb.tipPt && <p className="mt-2 rounded-xl bg-cream p-2 text-muted">💡 {fb.tipPt}</p>}
    </div>
  );
}
