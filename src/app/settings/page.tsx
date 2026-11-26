"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Download, RotateCcw, Trash2, Upload, Volume2 } from "lucide-react";
import { useReadyApp } from "@/components/AppProvider";
import { SpeakButton, SpeechHelp, useSpeechSupport } from "@/components/Speech";
import { Button, Card, Notice, PageHeader, Pill, SectionTitle } from "@/components/ui";
import { PERSONALITIES } from "@/content/scenarios";
import { parseBackup } from "@/lib/backup";
import { idbAvailable } from "@/lib/idb";
import { loadEnglishVoices } from "@/lib/speech";
import { fetchProviderStatus, type ProviderStatus } from "@/lib/tutor";
import type { DailyMinutes, Difficulty, Goal, Level, PersonalityId, TutorMode } from "@/lib/types";
import { cn, dateKey } from "@/lib/util";

function Segmented<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={String(o.id)} role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)} className={cn("rounded-full border px-4 py-2 text-sm font-bold", value === o.id ? "border-ink bg-ink text-white" : "border-line bg-white hover:bg-cream")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const LEVELS: { id: Level; label: string }[] = [
  { id: "beginner", label: "Beginner" },
  { id: "elementary", label: "Elementary" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
];
const GOALS: { id: Goal; label: string }[] = [
  { id: "everyday", label: "Everyday life" },
  { id: "work", label: "Work" },
  { id: "travel", label: "Travel" },
  { id: "study", label: "Study" },
  { id: "fluency", label: "General fluency" },
];
const MINUTES: { id: DailyMinutes; label: string }[] = [5, 10, 15, 20].map((m) => ({ id: m as DailyMinutes, label: `${m} min` }));
const DIFFS: { id: Difficulty; label: string }[] = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
];

export default function SettingsPage() {
  const { data, settings, saveSettings, exportBackup, importBackup, resetProgress } = useReadyApp();
  const { tts, stt, checked } = useSpeechSupport();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<{ tone: "info" | "danger"; text: string } | null>(null);
  const [pending, setPending] = useState<ReturnType<typeof parseBackup> | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadEnglishVoices().then(setVoices);
  }, []);

  const checkProvider = async (mode: TutorMode) => {
    if (mode === "offline") return setStatus(null);
    setChecking(true);
    setStatus(await fetchProviderStatus(mode));
    setChecking(false);
  };

  useEffect(() => {
    if (settings.tutorMode === "offline") return;
    let cancelled = false;
    void fetchProviderStatus(settings.tutorMode).then((s) => {
      if (!cancelled) setStatus(s);
    });
    return () => {
      cancelled = true;
    };
    // Only check once on mount; later changes call checkProvider explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doExport = () => {
    const blob = new Blob([JSON.stringify(exportBackup(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lumo-english-backup-${dateKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ tone: "info", text: "Backup downloaded. Keep the file somewhere safe." });
  };

  const onFile = async (file: File | undefined) => {
    setMessage(null);
    setPending(null);
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) return setMessage({ tone: "danger", text: "That file is too large to be a Lumo backup." });
    try {
      const json: unknown = JSON.parse(await file.text());
      const parsed = parseBackup(json);
      if (!parsed.ok) setMessage({ tone: "danger", text: parsed.error });
      else setPending(parsed);
    } catch {
      setMessage({ tone: "danger", text: "This file is not valid JSON." });
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const confirmImport = async () => {
    if (!pending || !pending.ok) return;
    await importBackup(pending.data);
    setMessage({ tone: "info", text: "Backup restored successfully." });
    setPending(null);
  };

  const doReset = async () => {
    await resetProgress();
    setConfirmText("");
    setMessage({ tone: "info", text: "Learning progress was reset. Your preferences were kept." });
  };

  const counts = [
    ["Lessons completed", Object.keys(data.progress).length],
    ["Exercise attempts", data.attempts.length],
    ["Vocabulary words", data.vocab.length],
    ["Activity entries", data.activity.length],
    ["Conversations", data.conversations.length],
  ] as const;

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" subtitle="Preferences, speech, AI tutor and your data." />
      {message && <Notice tone={message.tone === "danger" ? "danger" : "info"}>{message.text}</Notice>}

      <section aria-label="Learning preferences">
        <SectionTitle>Learning</SectionTitle>
        <Card className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-bold">Languages</p>
            <Pill>🇧🇷 Portuguese → 🇬🇧 English</Pill>
            <p className="mt-1 text-xs text-muted">This version supports learning English from Portuguese.</p>
          </div>
          <div><p className="mb-2 text-sm font-bold">Current level</p><Segmented label="Level" value={settings.level} options={LEVELS} onChange={(level) => void saveSettings({ level })} /></div>
          <div><p className="mb-2 text-sm font-bold">Primary goal</p><Segmented label="Goal" value={settings.goal} options={GOALS} onChange={(goal) => void saveSettings({ goal })} /></div>
          <div><p className="mb-2 text-sm font-bold">Daily goal</p><Segmented label="Daily goal" value={settings.dailyMinutes} options={MINUTES} onChange={(dailyMinutes) => void saveSettings({ dailyMinutes })} /></div>
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <Link href="/onboarding" className="text-sm font-bold underline">Retake the placement quiz</Link>
            {settings.diagnostic && <span className="text-xs text-muted">Last result: {settings.diagnostic.correct}/{settings.diagnostic.total}</span>}
          </div>
        </Card>
      </section>

      <section aria-label="Speech">
        <SectionTitle>Speech & listening</SectionTitle>
        <Card className="space-y-4">
          {checked && !tts && <Notice tone="warning">Audio playback isn&apos;t supported in this browser.</Notice>}
          <div>
            <label htmlFor="voice" className="mb-2 block text-sm font-bold">English voice</label>
            <div className="flex gap-2">
              <select id="voice" value={settings.voiceURI ?? ""} onChange={(e) => void saveSettings({ voiceURI: e.target.value || null })} className="h-11 min-w-0 flex-1 rounded-full border border-line bg-white px-4 text-sm">
                <option value="">Automatic (best available)</option>
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                ))}
              </select>
              <SpeakButton text="Hello! Nice to meet you." label="Test voice" />
            </div>
            {voices.length === 0 && checked && tts && <p className="mt-1 text-xs text-muted">No English voices were reported yet. Your device may need to download one.</p>}
          </div>
          <div>
            <label htmlFor="rate" className="mb-2 flex items-center justify-between text-sm font-bold">
              <span className="flex items-center gap-2"><Volume2 className="size-4" aria-hidden /> Speaking speed</span>
              <span>{settings.speechRate.toFixed(2)}×</span>
            </label>
            <input id="rate" type="range" min={0.5} max={1.2} step={0.05} value={settings.speechRate} onChange={(e) => void saveSettings({ speechRate: Number(e.target.value) })} className="w-full accent-ink" />
          </div>
          <p className="text-sm text-muted">Speech recognition: {checked ? (stt ? "available in this browser" : "not supported in this browser (typing works everywhere)") : "checking…"}</p>
          <SpeechHelp />
        </Card>
      </section>

      <section aria-label="AI tutor">
        <SectionTitle>AI tutor</SectionTitle>
        <Card className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-bold">Default tutor</p>
            <Segmented label="Tutor personality" value={settings.tutorPersonality} options={PERSONALITIES.map((p) => ({ id: p.id as PersonalityId, label: p.name }))} onChange={(tutorPersonality) => void saveSettings({ tutorPersonality })} />
          </div>
          <div><p className="mb-2 text-sm font-bold">Difficulty</p><Segmented label="Tutor difficulty" value={settings.tutorDifficulty} options={DIFFS} onChange={(tutorDifficulty) => void saveSettings({ tutorDifficulty })} /></div>
          <div>
            <p className="mb-2 text-sm font-bold">Tutor engine</p>
            <Segmented
              label="Tutor engine"
              value={settings.tutorMode}
              options={[
                { id: "offline" as TutorMode, label: "Offline (default)" },
                { id: "ollama" as TutorMode, label: "Local AI (Ollama)" },
                { id: "external" as TutorMode, label: "External API" },
              ]}
              onChange={(tutorMode) => {
                void saveSettings({ tutorMode });
                void checkProvider(tutorMode);
              }}
            />
            {settings.tutorMode === "offline" && <p className="mt-2 text-sm text-muted">Scripted role-plays with rule-based hints. Works without internet and without any API.</p>}
            {settings.tutorMode !== "offline" && (
              <div className="mt-3 space-y-2">
                <Notice tone={status?.available ? "info" : "warning"} title={checking ? "Checking…" : status?.available ? "Provider ready" : "Provider not available"}>
                  {checking ? "Contacting the server…" : status?.message}
                </Notice>
                <Button variant="secondary" size="sm" loading={checking} onClick={() => void checkProvider(settings.tutorMode)}>Check again</Button>
                {settings.tutorMode === "external" && (
                  <p className="text-sm text-muted"><b>Privacy:</b> in this mode your tutor messages are sent from the server to the provider you configured. Credentials stay on the server in environment variables and never reach the browser.</p>
                )}
                <p className="text-xs text-muted">AI feedback is learning assistance — it can be wrong and is not a guaranteed grammar or pronunciation assessment. If the provider is down you can always continue with the offline tutor.</p>
              </div>
            )}
          </div>
        </Card>
      </section>

      <section aria-label="Data">
        <SectionTitle>Your data</SectionTitle>
        <Card className="space-y-5">
          <p className="text-sm text-muted">Everything is stored locally in this browser (IndexedDB){checked && !idbAvailable() ? " — which is unavailable right now" : ""}. Nothing is uploaded unless you enable an external AI provider.</p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {counts.map(([k, v]) => (
              <li key={k} className="rounded-2xl bg-cream p-3 text-center"><p className="text-xl font-extrabold">{v}</p><p className="text-[11px] text-muted">{k}</p></li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            <Button onClick={doExport}><Download className="size-4" aria-hidden /> Export backup (JSON)</Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}><Upload className="size-4" aria-hidden /> Import backup</Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Choose a backup file" onChange={(e) => void onFile(e.target.files?.[0])} />
          </div>
          {pending?.ok && (
            <Notice tone="warning" title="Backup file is valid" action={<div className="flex gap-2"><Button size="sm" variant="danger" onClick={() => void confirmImport()}>Replace my data</Button><Button size="sm" variant="ghost" onClick={() => setPending(null)}>Cancel</Button></div>}>
              It contains {pending.data.vocab.length} words, {Object.keys(pending.data.progress).length} completed lessons and {pending.data.attempts.length} attempts. Importing replaces everything currently stored.
            </Notice>
          )}
        </Card>

        <Card className="mt-4 border-danger/30">
          <p className="flex items-center gap-2 font-extrabold text-danger"><Trash2 className="size-4" aria-hidden /> Reset learning progress</p>
          <p className="mt-1 text-sm text-muted">Deletes completed lessons, XP, streaks, vocabulary, attempts and conversations. Your preferences stay. This cannot be undone — export a backup first.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} aria-label="Type RESET to confirm" placeholder="Type RESET to confirm" className="h-11 w-56 rounded-full border border-line bg-white px-4 text-sm outline-none focus:border-danger" />
            <Button variant="danger" disabled={confirmText !== "RESET"} onClick={() => void doReset()}><RotateCcw className="size-4" aria-hidden /> Reset progress</Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
