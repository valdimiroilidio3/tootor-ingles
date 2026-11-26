"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { ExerciseView } from "@/components/ExerciseView";
import { Mascot } from "@/components/Mascot";
import { Button, Card, ProgressBar } from "@/components/ui";
import { DIAGNOSTIC } from "@/content/diagnostic";
import { getLesson } from "@/content";
import { recommendPlacement, type Placement, type PlacementAnswer } from "@/lib/placement";
import type { DailyMinutes, Goal, Level } from "@/lib/types";
import { cn } from "@/lib/util";

const LEVELS: { id: Level; label: string; hint: string; start: string }[] = [
  { id: "beginner", label: "Beginner", hint: "I know almost no English.", start: "a1-greetings" },
  { id: "elementary", label: "Elementary", hint: "I know basic words and phrases.", start: "a1-routine" },
  { id: "intermediate", label: "Intermediate", hint: "I can hold simple conversations.", start: "a2-weekend-past" },
  { id: "advanced", label: "Advanced", hint: "I want to polish work and fluency.", start: "b1-work-meetings" },
];
const GOALS: { id: Goal; label: string; emoji: string }[] = [
  { id: "everyday", label: "Everyday life", emoji: "🏠" },
  { id: "work", label: "Work", emoji: "💼" },
  { id: "travel", label: "Travel", emoji: "✈️" },
  { id: "study", label: "Study", emoji: "🎓" },
  { id: "fluency", label: "General fluency", emoji: "🌍" },
];
const MINUTES: DailyMinutes[] = [5, 10, 15, 20];
const MINUTE_HINT: Record<DailyMinutes, string> = { 5: "Casual", 10: "Regular", 15: "Serious", 20: "Intense" };

type Step = "welcome" | "level" | "goal" | "daily" | "diag-intro" | "quiz" | "result";
const ORDER: Step[] = ["welcome", "level", "goal", "daily", "diag-intro", "quiz", "result"];

function Choice({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn("flex w-full items-center gap-3 rounded-2xl border-2 border-b-4 bg-white px-4 py-4 text-left transition-all", selected ? "border-ink bg-brand-soft" : "border-line hover:bg-cream")}
    >
      <span className="flex-1">{children}</span>
      {selected && <Check className="size-5" aria-hidden />}
    </button>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { data, saveSettings } = useApp();
  const existing = data.settings;
  const [step, setStep] = useState<Step>("welcome");
  const [level, setLevel] = useState<Level>(existing?.level ?? "beginner");
  const [goal, setGoal] = useState<Goal>(existing?.goal ?? "everyday");
  const [minutes, setMinutes] = useState<DailyMinutes>(existing?.dailyMinutes ?? 10);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<PlacementAnswer[]>([]);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [saving, setSaving] = useState(false);

  const idx = ORDER.indexOf(step);
  const levelStart = LEVELS.find((l) => l.id === level)?.start ?? "a1-greetings";

  const next = () => setStep(ORDER[Math.min(ORDER.length - 1, idx + 1)]);
  const back = () => setStep(ORDER[Math.max(0, idx - 1)]);

  const finish = async (lessonId: string, diagnostic?: { correct: number; total: number }) => {
    setSaving(true);
    await saveSettings({
      onboarded: true,
      level,
      goal,
      dailyMinutes: minutes,
      startingLessonId: lessonId,
      diagnostic: diagnostic ? { ...diagnostic, date: new Date().toISOString() } : existing?.diagnostic,
    });
    router.push("/learn");
  };

  const quiz = DIAGNOSTIC[qIndex];
  const startLesson = useMemo(() => (placement ? getLesson(placement.lessonId) : null), [placement]);

  if (step === "quiz" && quiz) {
    return (
      <div className="flex h-dvh flex-col bg-cream">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 pt-4">
          <ProgressBar value={(qIndex / DIAGNOSTIC.length) * 100} label="Quiz progress" className="flex-1" />
          <span className="text-sm font-bold">{qIndex + 1}/{DIAGNOSTIC.length}</span>
        </div>
        <ExerciseView
          key={quiz.exercise.id}
          exercise={quiz.exercise}
          continueLabel={qIndex + 1 === DIAGNOSTIC.length ? "See result" : "Continue"}
          onChecked={({ correct }) => setAnswers((a) => [...a, { cefr: quiz.cefr, correct }])}
          onContinue={() => {
            if (qIndex + 1 >= DIAGNOSTIC.length) {
              setPlacement(recommendPlacement(answers));
              setStep("result");
            } else setQIndex(qIndex + 1);
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 pb-8 pt-6">
      {step !== "welcome" && (
        <div className="mb-6 flex items-center gap-3">
          <button onClick={back} aria-label="Go back" className="grid size-10 place-items-center rounded-full bg-white shadow-soft">
            <ArrowLeft className="size-5" />
          </button>
          <ProgressBar value={(idx / (ORDER.length - 1)) * 100} label="Setup progress" className="flex-1" />
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }} className="flex flex-1 flex-col">
          {step === "welcome" && (
            <div className="my-auto text-center">
              <Mascot mood="cheer" size={170} />
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight">Hi, I&apos;m Lumo!</h1>
              <p className="mx-auto mt-3 max-w-sm text-[17px] text-muted">
                Let&apos;s set up your personal English course. It takes about a minute. Everything stays on this device — no account needed.
              </p>
              <div className="mx-auto mt-6 flex max-w-xs items-center justify-center gap-2 rounded-2xl bg-white p-3 text-sm font-bold shadow-soft">
                🇧🇷 Portuguese <ArrowRight className="size-4" aria-hidden /> 🇬🇧 English
              </div>
              <Button size="lg" onClick={next} className="mt-8 w-full">
                {existing?.onboarded ? "Update my setup" : "Let's start"}
              </Button>
              {existing?.onboarded && (
                <Button variant="ghost" onClick={() => router.push("/settings")} className="mt-2 w-full">
                  Cancel
                </Button>
              )}
            </div>
          )}

          {step === "level" && (
            <>
              <h1 className="text-3xl font-extrabold tracking-tight">What&apos;s your current level?</h1>
              <p className="mt-1 text-muted">Be honest — a quick quiz will fine-tune your starting lesson.</p>
              <div role="radiogroup" aria-label="Current level" className="mt-6 grid gap-3">
                {LEVELS.map((l) => (
                  <Choice key={l.id} selected={level === l.id} onClick={() => setLevel(l.id)}>
                    <span className="block font-extrabold">{l.label}</span>
                    <span className="text-sm text-muted">{l.hint}</span>
                  </Choice>
                ))}
              </div>
              <Button size="lg" onClick={next} className="mt-auto w-full">Continue</Button>
            </>
          )}

          {step === "goal" && (
            <>
              <h1 className="text-3xl font-extrabold tracking-tight">Why are you learning English?</h1>
              <p className="mt-1 text-muted">Pick your main goal.</p>
              <div role="radiogroup" aria-label="Primary goal" className="mt-6 grid gap-3">
                {GOALS.map((g) => (
                  <Choice key={g.id} selected={goal === g.id} onClick={() => setGoal(g.id)}>
                    <span className="mr-2 text-xl" aria-hidden>{g.emoji}</span>
                    <span className="font-extrabold">{g.label}</span>
                  </Choice>
                ))}
              </div>
              <Button size="lg" onClick={next} className="mt-auto w-full">Continue</Button>
            </>
          )}

          {step === "daily" && (
            <>
              <h1 className="text-3xl font-extrabold tracking-tight">Set your daily goal</h1>
              <p className="mt-1 text-muted">You can change this anytime in Settings.</p>
              <div role="radiogroup" aria-label="Daily goal" className="mt-6 grid gap-3">
                {MINUTES.map((m) => (
                  <Choice key={m} selected={minutes === m} onClick={() => setMinutes(m)}>
                    <span className="font-extrabold">{m} minutes a day</span>
                    <span className="ml-2 text-sm text-muted">{MINUTE_HINT[m]}</span>
                  </Choice>
                ))}
              </div>
              <Button size="lg" onClick={next} className="mt-auto w-full">Continue</Button>
            </>
          )}

          {step === "diag-intro" && (
            <div className="my-auto text-center">
              <Mascot mood="thinking" size={130} />
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Quick placement quiz</h1>
              <p className="mx-auto mt-2 max-w-sm text-muted">
                10 short questions help me suggest where to start. It&apos;s a study recommendation — not an official CEFR test.
              </p>
              <Button size="lg" className="mt-8 w-full" onClick={() => { setQIndex(0); setAnswers([]); setStep("quiz"); }}>
                Take the quiz
              </Button>
              <Button variant="secondary" size="lg" className="mt-3 w-full" loading={saving} onClick={() => finish(levelStart)}>
                Skip — start at my level
              </Button>
              <p className="mt-2 text-xs text-muted">Skipping starts you at “{getLesson(levelStart)?.title}”.</p>
            </div>
          )}

          {step === "result" && placement && (
            <div className="my-auto text-center">
              <Mascot mood="cheer" size={140} />
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
                You scored {placement.correct}/{placement.total}
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-muted">{placement.summary}</p>
              <Card className="mx-auto mt-6 max-w-sm text-left">
                <p className="text-xs font-extrabold uppercase tracking-widest text-muted">Recommended start</p>
                <p className="mt-1 text-xl font-extrabold">{startLesson?.emoji} {startLesson?.title}</p>
                <p className="text-sm text-muted">{startLesson?.cefr} · {startLesson?.objectivePt}</p>
              </Card>
              <p className="mx-auto mt-3 max-w-sm text-xs text-muted">Lessons before this one are unlocked too, so you can revisit them anytime.</p>
              <Button size="lg" className="mt-6 w-full" loading={saving} onClick={() => finish(placement.lessonId, { correct: placement.correct, total: placement.total })}>
                Start learning
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
