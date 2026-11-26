"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, Layers, RotateCcw } from "lucide-react";
import { useReadyApp } from "@/components/AppProvider";
import { Mascot } from "@/components/Mascot";
import { SpeakControls } from "@/components/Speech";
import { Button, Card, EmptyState, LinkButton, PageHeader, ProgressBar } from "@/components/ui";
import { getReviewQueue, isDue, reviewItem, type Grade } from "@/lib/srs";
import type { VocabItem } from "@/lib/types";
import { cn, formatDuration } from "@/lib/util";
import { reviewXp } from "@/lib/xp";

const GRADES: { id: Grade; label: string; style: string }[] = [
  { id: "again", label: "Again", style: "bg-danger-soft border-danger/40 text-danger" },
  { id: "hard", label: "Hard", style: "bg-white border-line" },
  { id: "good", label: "Good", style: "bg-success-soft border-success/40 text-[#1d6b3c]" },
  { id: "easy", label: "Easy", style: "bg-brand border-brand-dark" },
];

function intervalLabel(item: VocabItem, grade: Grade): string {
  const now = new Date();
  const ms = new Date(reviewItem(item, grade, now).nextReview).getTime() - now.getTime();
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${Math.max(1, mins)} min`;
  const days = Math.round(ms / 86_400_000);
  return days === 1 ? "1 day" : `${days} days`;
}

interface Session {
  queue: VocabItem[];
  practiceAhead: boolean;
  startedAt: number;
}

export default function ReviewPage() {
  const { data, reviewVocab, recordActivity } = useReadyApp();
  const [session, setSession] = useState<Session | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [counts, setCounts] = useState({ ok: 0, again: 0, dueOk: 0 });
  const [done, setDone] = useState<{ xp: number; seconds: number } | null>(null);
  const busy = useRef(false);

  const dueNow = data.vocab.filter((v) => isDue(v)).length;

  const start = (ahead: boolean) => {
    const now = new Date();
    const queue = ahead
      ? [...data.vocab].sort((a, b) => a.familiarity - b.familiarity || b.incorrect - a.incorrect).slice(0, 10)
      : getReviewQueue(data.vocab, now, 20);
    if (queue.length === 0) return;
    setSession({ queue, practiceAhead: ahead, startedAt: Date.now() });
    setIndex(0);
    setFlipped(false);
    setCounts({ ok: 0, again: 0, dueOk: 0 });
    setDone(null);
  };

  const card = session?.queue[index];

  const grade = async (g: Grade) => {
    if (!session || !card || busy.current) return;
    busy.current = true;
    const wasDue = isDue(card);
    await reviewVocab(card.id, g);
    const next = { ok: counts.ok + (g === "again" ? 0 : 1), again: counts.again + (g === "again" ? 1 : 0), dueOk: counts.dueOk + (g !== "again" && wasDue && !session.practiceAhead ? 1 : 0) };
    setCounts(next);
    if (index + 1 >= session.queue.length) {
      const seconds = Math.min(30 * 60, (Date.now() - session.startedAt) / 1000);
      const xp = session.practiceAhead ? 0 : reviewXp(next.dueOk);
      await recordActivity({ kind: "review", xp, seconds });
      setDone({ xp, seconds });
    } else {
      setIndex(index + 1);
      setFlipped(false);
    }
    busy.current = false;
  };

  // Keyboard: Space flips, 1-4 grade
  const gradeRef = useRef(grade);
  const flippedRef = useRef(flipped);
  useEffect(() => {
    gradeRef.current = grade;
    flippedRef.current = flipped;
  });
  useEffect(() => {
    if (!session || done) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === " " && !flippedRef.current && t?.tagName !== "BUTTON") {
        e.preventDefault();
        setFlipped(true);
      } else if (flippedRef.current && ["1", "2", "3", "4"].includes(e.key)) {
        void gradeRef.current(GRADES[Number(e.key) - 1].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session, done]);

  if (data.vocab.length === 0) {
    return (
      <div>
        <PageHeader title="Review" subtitle="Flashcards with spaced repetition." />
        <EmptyState icon="🗂️" title="Nothing to review yet" text="Finish a lesson or add words manually, and they will appear here on a smart schedule." action={<LinkButton href="/vocabulary">Open vocabulary</LinkButton>} />
      </div>
    );
  }

  if (done && session) {
    return (
      <div className="mx-auto max-w-md text-center">
        <Mascot mood="cheer" size={140} />
        <h1 className="mt-3 text-3xl font-extrabold">Review complete!</h1>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Card className="p-4"><p className="text-2xl font-extrabold">{counts.ok}</p><p className="text-xs text-muted">remembered</p></Card>
          <Card className="p-4"><p className="text-2xl font-extrabold">{counts.again}</p><p className="text-xs text-muted">to repeat</p></Card>
          <Card className="p-4"><p className="text-2xl font-extrabold">+{done.xp}</p><p className="text-xs text-muted">XP</p></Card>
        </div>
        <p className="mt-3 text-sm text-muted">{formatDuration(done.seconds)} · {session.practiceAhead ? "Practising ahead earns no XP." : "Words you missed will come back soon."}</p>
        <div className="mt-6 grid gap-3">
          {dueNow > 0 && <Button size="lg" onClick={() => start(false)}><RotateCcw className="size-5" aria-hidden /> Review {dueNow} more due</Button>}
          <LinkButton href="/" variant="secondary" size="lg">Back to dashboard</LinkButton>
        </div>
      </div>
    );
  }

  if (!session || !card) {
    return (
      <div>
        <PageHeader title="Review" subtitle="Flashcards scheduled with spaced repetition. Words that are new, overdue or often missed come first." />
        <Card className="mx-auto max-w-lg text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-brand"><Layers className="size-8" aria-hidden /></span>
          <p className="mt-4 text-4xl font-extrabold">{dueNow}</p>
          <p className="text-muted">{dueNow === 1 ? "word is" : "words are"} due now · {data.vocab.length} total</p>
          {dueNow > 0 ? (
            <Button size="lg" className="mt-6 w-full" onClick={() => start(false)}>Start review ({Math.min(dueNow, 20)} cards)</Button>
          ) : (
            <>
              <p className="mt-4 rounded-2xl bg-success-soft p-3 text-sm font-bold text-[#1d6b3c]">You&apos;re all caught up. Come back later for your next reviews.</p>
              <Button variant="secondary" size="lg" className="mt-4 w-full" onClick={() => start(true)}>Practise 10 weakest words (no XP)</Button>
            </>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex items-center gap-3">
        <ProgressBar value={(index / session.queue.length) * 100} label="Review progress" className="flex-1" />
        <span className="text-sm font-bold">{index + 1}/{session.queue.length}</span>
      </div>
      <Card className="min-h-80 text-center">
        <p className="text-xs font-extrabold uppercase tracking-widest text-muted">{flipped ? "Meaning" : "What does this mean?"}</p>
        <p className="mt-5 text-4xl font-extrabold tracking-tight">{card.word}</p>
        <div className="mt-4 flex justify-center"><SpeakControls text={card.word} /></div>
        {flipped ? (
          <div className="mt-6 rounded-2xl bg-cream p-4 text-left" aria-live="polite">
            <p className="text-2xl font-extrabold">{card.translation}</p>
            {card.example && <p className="mt-3 text-sm">“{card.example}”{card.exampleTranslation && <span className="block text-muted">{card.exampleTranslation}</span>}</p>}
            {card.context && <p className="mt-2 text-xs text-muted">Context: {card.context}</p>}
          </div>
        ) : (
          <Button size="lg" className="mt-8" onClick={() => setFlipped(true)}><Eye className="size-5" aria-hidden /> Show answer</Button>
        )}
      </Card>
      {flipped && (
        <div className="mt-4 grid grid-cols-4 gap-2" role="group" aria-label="How well did you remember?">
          {GRADES.map((g, i) => (
            <button key={g.id} onClick={() => void grade(g.id)} className={cn("rounded-2xl border-2 border-b-4 px-1 py-3 text-center font-extrabold transition-transform active:translate-y-0.5", g.style)}>
              <span className="block text-[15px]">{g.label}</span>
              <span className="block text-[11px] font-semibold opacity-70">{intervalLabel(card, g.id)}</span>
              <span className="sr-only">Shortcut {i + 1}</span>
            </button>
          ))}
        </div>
      )}
      <p className="mt-3 text-center text-xs text-muted">{session.practiceAhead ? "Practising ahead — no XP." : "Shortcuts: Space shows the answer, 1–4 grades it."}</p>
    </div>
  );
}
