"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Clock, Heart, HeartCrack, Lock, RotateCcw, Target, X, Zap } from "lucide-react";
import { useReadyApp, type FinishLessonResult, type LessonResultInput } from "./AppProvider";
import { ExerciseView } from "./ExerciseView";
import { Mascot } from "./Mascot";
import { SpeakControls, SpeechUnavailableNote } from "./Speech";
import { Button, Card, LinkButton, Pill, ProgressBar } from "./ui";
import { getLesson, isUnlocked, LESSONS, lessonIndex } from "@/content";
import { buildDailyChallenge, dailyId, DAILY_PREFIX } from "@/lib/daily";
import { exercisePrompt, expectedAnswer, MAX_HEARTS } from "@/lib/scoring";
import type { Lesson } from "@/lib/types";
import { cn, dateKey, formatDuration } from "@/lib/util";

type Stage = "intro" | "play" | "done" | "failed";

export function LessonRunner({ id }: { id: string }) {
  const { data, settings } = useReadyApp();
  const isDaily = id.startsWith(DAILY_PREFIX);
  const today = dateKey();

  const lesson: Lesson | null = useMemo(() => {
    if (isDaily) return id === dailyId(today) ? buildDailyChallenge(today, data.progress, settings) : null;
    return getLesson(id) ?? null;
    // Progress is intentionally read once so the lesson stays stable while playing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isDaily, today]);

  if (!lesson) {
    return (
      <Centered>
        <Mascot mood="thinking" size={110} />
        <h1 className="mt-4 text-2xl font-extrabold">{isDaily ? "This challenge has expired" : "Lesson not found"}</h1>
        <p className="mt-1 text-muted">{isDaily ? "Daily challenges are only available on the day they are created." : "That lesson doesn't exist in the curriculum."}</p>
        <LinkButton href="/learn" className="mt-6">
          Back to learning path
        </LinkButton>
      </Centered>
    );
  }

  if (!isDaily && !isUnlocked(lessonIndex(id), data.progress, settings)) {
    return (
      <Centered>
        <div className="grid size-20 place-items-center rounded-full bg-white shadow-soft">
          <Lock className="size-8" aria-hidden />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold">This lesson is locked</h1>
        <p className="mt-1 max-w-sm text-muted">Complete the previous lesson to unlock “{lesson.title}”.</p>
        <LinkButton href="/learn" className="mt-6">
          Back to learning path
        </LinkButton>
      </Centered>
    );
  }

  return <Runner key={lesson.id} lesson={lesson} isDaily={isDaily} />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">{children}</div>;
}

function Runner({ lesson, isDaily }: { lesson: Lesson; isDaily: boolean }) {
  const router = useRouter();
  const { data, finishLesson } = useReadyApp();
  const [stage, setStage] = useState<Stage>("intro");
  const [index, setIndex] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [results, setResults] = useState<LessonResultInput[]>([]);
  const [summary, setSummary] = useState<(FinishLessonResult & { seconds: number }) | null>(null);
  const [saving, setSaving] = useState(false);
  const startedAt = useRef<number>(0);
  const heartsRef = useRef(MAX_HEARTS);
  const resultsRef = useRef<LessonResultInput[]>([]);

  const alreadyDone = Boolean(data.progress[lesson.id]);
  const exercise = lesson.exercises[index];

  const start = () => {
    startedAt.current = Date.now();
    setStage("play");
  };

  const restart = () => {
    heartsRef.current = MAX_HEARTS;
    resultsRef.current = [];
    setHearts(MAX_HEARTS);
    setResults([]);
    setIndex(0);
    setSummary(null);
    startedAt.current = Date.now();
    setStage("play");
  };

  const finish = async (passed: boolean) => {
    setSaving(true);
    const seconds = Math.min(25 * 60, (Date.now() - startedAt.current) / 1000);
    const res = await finishLesson({
      lessonId: lesson.id,
      kind: isDaily ? "daily" : "lesson",
      baseXp: lesson.xp,
      passed,
      results: resultsRef.current,
      seconds,
      vocab: lesson.vocabulary,
    });
    setSummary({ ...res, seconds });
    setSaving(false);
    setStage(passed ? "done" : "failed");
  };

  const onChecked = ({ correct, answer }: { correct: boolean; answer: string }) => {
    const r: LessonResultInput = {
      exerciseId: exercise.id,
      category: exercise.category,
      type: exercise.type,
      correct,
      answer,
      expected: expectedAnswer(exercise),
      prompt: exercisePrompt(exercise),
    };
    resultsRef.current = [...resultsRef.current, r];
    setResults(resultsRef.current);
    if (!correct) {
      heartsRef.current = Math.max(0, heartsRef.current - 1);
      setHearts(heartsRef.current);
    }
  };

  const onContinue = () => {
    if (saving) return;
    if (heartsRef.current === 0) void finish(false);
    else if (index + 1 >= lesson.exercises.length) void finish(true);
    else setIndex(index + 1);
  };

  const leave = () => {
    if (stage === "play" && !window.confirm("Leave this lesson? Your answers so far won't be saved.")) return;
    router.push(isDaily ? "/" : "/learn");
  };

  /* ---------------- Intro ---------------- */
  if (stage === "intro") {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={leave} aria-label="Close lesson" className="grid size-10 place-items-center rounded-full bg-white shadow-soft">
            <X className="size-5" />
          </button>
          <Pill tone="brand">{lesson.cefr}</Pill>
        </div>
        <Card className="text-center">
          <div className="text-5xl" aria-hidden>{lesson.emoji}</div>
          <p className="mt-2 text-xs font-extrabold uppercase tracking-widest text-muted">{lesson.unit}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{lesson.title}</h1>
          <p className="text-muted">{lesson.titlePt}</p>
          <div className="mx-auto mt-5 max-w-md rounded-2xl bg-cream p-4 text-left">
            <p className="flex items-center gap-2 text-sm font-extrabold"><Target className="size-4" aria-hidden /> Learning objective</p>
            <p className="mt-1">{lesson.objective}</p>
            <p className="text-sm text-muted">{lesson.objectivePt}</p>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm font-bold">
            <Pill><Zap className="size-3.5" aria-hidden /> {alreadyDone ? "Practice run · no extra XP" : `Up to ${lesson.xp} XP`}</Pill>
            <Pill>{lesson.exercises.length} exercises</Pill>
            <Pill><Heart className="size-3.5" aria-hidden /> {MAX_HEARTS} hearts</Pill>
          </div>
        </Card>

        {lesson.vocabulary.length > 0 && (
          <section className="mt-6" aria-labelledby="vocab-h">
            <h2 id="vocab-h" className="mb-3 text-lg font-extrabold">Words & phrases in this lesson</h2>
            <SpeechUnavailableNote />
            <ul className="mt-3 grid gap-3">
              {lesson.vocabulary.map((v) => (
                <li key={v.word} className="flex items-start gap-3 rounded-2xl border border-line bg-white p-4">
                  <SpeakControls text={v.word} size="sm" />
                  <div className="min-w-0">
                    <p className="font-extrabold">{v.word} <span className="font-semibold text-muted">— {v.translation}</span></p>
                    <p className="mt-0.5 text-sm">“{v.example}”</p>
                    <p className="text-sm text-muted">{v.exampleTranslation}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="sticky bottom-4 mt-8">
          <Button size="lg" onClick={start} className="w-full shadow-pop">
            Start lesson <ArrowRight className="size-5" aria-hidden />
          </Button>
        </div>
      </div>
    );
  }

  /* ---------------- Play ---------------- */
  if (stage === "play") {
    return (
      <div className="flex h-dvh flex-col bg-cream">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 pt-4">
          <button onClick={leave} aria-label="Leave lesson" className="grid size-10 shrink-0 place-items-center rounded-full bg-white shadow-soft">
            <X className="size-5" />
          </button>
          <ProgressBar value={(index / lesson.exercises.length) * 100} label="Lesson progress" className="flex-1" />
          <div className="flex items-center gap-1 font-extrabold" aria-label={`${hearts} hearts left`}>
            <Heart className={cn("size-6", hearts > 0 ? "fill-danger text-danger" : "text-muted")} aria-hidden />
            {hearts}
          </div>
        </div>
        <ExerciseView key={exercise.id} exercise={exercise} onChecked={onChecked} onContinue={onContinue} continueLabel={index + 1 >= lesson.exercises.length || hearts === 0 ? "Finish" : "Continue"} />
        <span className="sr-only" aria-live="polite">
          Question {index + 1} of {lesson.exercises.length}
        </span>
      </div>
    );
  }

  /* ---------------- Done / Failed ---------------- */
  const wrong = results.filter((r) => !r.correct);
  const passed = stage === "done";
  const nextIdx = lessonIndex(lesson.id) + 1;
  const next = !isDaily && nextIdx > 0 && nextIdx < LESSONS.length ? LESSONS[nextIdx] : null;
  const correctCount = results.filter((r) => r.correct).length;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-8">
      <div className="text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }} className="inline-block">
          <Mascot mood={passed ? "cheer" : "sad"} size={150} />
        </motion.div>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">{passed ? (summary && summary.accuracy === 1 ? "Perfect!" : "Lesson complete!") : "Out of hearts"}</h1>
        <p className="mt-1 text-muted">
          {passed ? lesson.title : "No XP was lost. Review the answers below, then try again when you're ready."}
        </p>
        {passed && summary && (
          <div className="mt-3 text-3xl" aria-label={`${summary.stars} of 3 stars`}>
            {[1, 2, 3].map((n) => (
              <span key={n} className={n <= summary.stars ? "" : "opacity-20 grayscale"}>⭐</span>
            ))}
          </div>
        )}
      </div>

      {summary && (
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <Card className="p-4">
            <Zap className="mx-auto size-5" aria-hidden />
            <p className="mt-1 text-2xl font-extrabold">+{summary.xpAwarded}</p>
            <p className="text-xs text-muted">XP</p>
          </Card>
          <Card className="p-4">
            <Target className="mx-auto size-5" aria-hidden />
            <p className="mt-1 text-2xl font-extrabold">{Math.round(summary.accuracy * 100)}%</p>
            <p className="text-xs text-muted">{correctCount}/{results.length} correct</p>
          </Card>
          <Card className="p-4">
            <Clock className="mx-auto size-5" aria-hidden />
            <p className="mt-1 text-2xl font-extrabold">{formatDuration(summary.seconds)}</p>
            <p className="text-xs text-muted">time</p>
          </Card>
        </div>
      )}

      {summary && passed && !summary.firstCompletion && (
        <p className="mt-3 rounded-2xl bg-white p-3 text-center text-sm text-muted">You already earned XP for this {isDaily ? "challenge" : "lesson"}, so reopening it doesn&apos;t add more. Great extra practice!</p>
      )}
      {summary && summary.wordsAdded > 0 && (
        <p className="mt-3 rounded-2xl bg-white p-3 text-center text-sm">📚 {summary.wordsAdded} new {summary.wordsAdded === 1 ? "word was" : "words were"} added to your <Link href="/vocabulary" className="font-bold underline">vocabulary notebook</Link>.</p>
      )}
      {summary && summary.newBadges.length > 0 && (
        <Card className="mt-4 bg-brand-soft">
          <p className="font-extrabold">New badge{summary.newBadges.length > 1 ? "s" : ""} unlocked!</p>
          <ul className="mt-2 grid gap-2">
            {summary.newBadges.map((b) => (
              <li key={b.id} className="flex items-center gap-3">
                <span className="text-3xl" aria-hidden>{b.emoji}</span>
                <span><span className="font-bold">{b.title}</span> <span className="text-sm text-ink/70">· {b.description}</span></span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <section className="mt-8" aria-labelledby="review-h">
        <h2 id="review-h" className="mb-3 flex items-center gap-2 text-lg font-extrabold">
          {wrong.length > 0 && <HeartCrack className="size-5 text-danger" aria-hidden />} {wrong.length > 0 ? `Review your mistakes (${wrong.length})` : "No mistakes — well done!"}
        </h2>
        <ul className="grid gap-3">
          {wrong.map((r) => {
            const ex = lesson.exercises.find((e) => e.id === r.exerciseId);
            return (
              <li key={r.exerciseId} className="rounded-2xl border border-line bg-white p-4">
                <p className="font-bold">{r.prompt}</p>
                <p className="mt-1 text-sm"><span className="font-bold text-danger">Your answer:</span> {r.answer || "—"}</p>
                <p className="text-sm"><span className="font-bold text-[#1d6b3c]">Correct:</span> {r.expected}</p>
                {ex && <p className="mt-1 text-sm text-muted">{ex.explanation}</p>}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {passed && next && (
          <LinkButton href={`/lesson/${next.id}`} size="lg" className="sm:col-span-2">
            Next: {next.title} <ArrowRight className="size-5" aria-hidden />
          </LinkButton>
        )}
        <Button variant="secondary" size="lg" onClick={restart}>
          <RotateCcw className="size-5" aria-hidden /> {passed ? "Practice again" : "Try again"}
        </Button>
        <LinkButton href={isDaily ? "/" : "/learn"} variant={passed && !next ? "primary" : "secondary"} size="lg">
          {isDaily ? "Back to dashboard" : "Back to path"}
        </LinkButton>
      </div>
    </div>
  );
}
