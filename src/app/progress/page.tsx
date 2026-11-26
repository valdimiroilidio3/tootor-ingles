"use client";

import { useMemo } from "react";
import { BookOpen, CheckCircle2, Clock, Target } from "lucide-react";
import { useReadyApp } from "@/components/AppProvider";
import { Card, EmptyState, Notice, PageHeader, ProgressBar, SectionTitle, StatTile } from "@/components/ui";
import { evaluateBadges } from "@/lib/achievements";
import { isLearned } from "@/lib/srs";
import { CATEGORY_LABELS } from "@/lib/scoring";
import { categoryStats, frequentMistakes, lastDays, overallAccuracy, personalBests, strongestWeakest, totalXp } from "@/lib/stats";
import { useDerived } from "@/lib/useDerived";
import { cn, formatDuration } from "@/lib/util";

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ProgressPage() {
  const { data } = useReadyApp();
  const d = useDerived();

  const s = useMemo(() => {
    const today = d?.today ?? "";
    const cats = categoryStats(data.attempts);
    const sw = strongestWeakest(cats);
    return {
      cats,
      sw,
      acc: overallAccuracy(data.attempts),
      seconds: data.activity.reduce((t, a) => t + a.seconds, 0),
      days: lastDays(data.activity, today, 14),
      repeated: frequentMistakes(data.attempts),
      badges: evaluateBadges(data, today),
      xp: totalXp(data.activity),
    };
  }, [data, d?.today]);
  if (!d) return null;

  const bests = personalBests(data.activity, data.progress, d.streak.longest);
  const maxXp = Math.max(1, ...s.days.map((x) => x.xp));
  const empty = data.activity.length === 0;

  return (
    <div className="space-y-8">
      <PageHeader title="Progress" subtitle="Every number here is calculated from your saved activity on this device." />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Summary">
        <StatTile icon={<Clock className="size-4" />} label="Study time" value={formatDuration(s.seconds)} hint={`${d.xp} XP total`} />
        <StatTile icon={<CheckCircle2 className="size-4" />} label="Lessons" value={d.completedLessons} hint="completed" />
        <StatTile icon={<BookOpen className="size-4" />} label="Words learned" value={data.vocab.filter(isLearned).length} hint={`of ${data.vocab.length} saved`} />
        <StatTile icon={<Target className="size-4" />} label="Accuracy" value={s.acc === null ? "—" : `${Math.round(s.acc * 100)}%`} hint={`${data.attempts.length} answers`} />
      </section>

      <section aria-label="Activity">
        <SectionTitle>Last 14 days</SectionTitle>
        <Card>
          {empty ? (
            <EmptyState title="No activity yet" text="Finish a lesson or a review and your daily activity will appear here." />
          ) : (
            <div className="flex h-44 items-end gap-1.5 sm:gap-2" role="img" aria-label="Bar chart of XP earned per day for the last 14 days">
              {s.days.map((x) => (
                <div key={x.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${x.date}: ${x.xp} XP, ${formatDuration(x.seconds)}`}>
                  <span className="text-[10px] font-bold">{x.xp > 0 ? x.xp : ""}</span>
                  <div className={cn("w-full rounded-t-lg", x.xp > 0 ? "bg-brand ring-1 ring-inset ring-black/10" : "bg-ink/10")} style={{ height: `${Math.max(4, (x.xp / maxXp) * 100)}%` }} />
                  <span className="text-[10px] text-muted">{DAY[new Date(`${x.date}T12:00:00`).getDay()][0]}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-label="Categories">
          <SectionTitle>Skills by exercise type</SectionTitle>
          <Card>
            {s.cats.length === 0 ? (
              <p className="text-sm text-muted">Answer some exercises to see which areas are strongest and weakest.</p>
            ) : (
              <ul className="space-y-4">
                {s.cats
                  .sort((a, b) => b.accuracy - a.accuracy)
                  .map((c) => (
                    <li key={c.category}>
                      <div className="mb-1 flex justify-between text-sm font-bold">
                        <span>{CATEGORY_LABELS[c.category]}</span>
                        <span>{Math.round(c.accuracy * 100)}% <span className="font-normal text-muted">({c.correct}/{c.total})</span></span>
                      </div>
                      <ProgressBar value={c.accuracy * 100} tone={c.accuracy >= 0.8 ? "success" : "brand"} label={CATEGORY_LABELS[c.category]} />
                    </li>
                  ))}
              </ul>
            )}
            {s.sw.strongest && (
              <p className="mt-4 text-sm">
                💪 Strongest: <b>{CATEGORY_LABELS[s.sw.strongest.category]}</b>
                {s.sw.weakest && <> · 🎯 To practise: <b>{CATEGORY_LABELS[s.sw.weakest.category]}</b></>}
              </p>
            )}
            {s.cats.length > 0 && !s.sw.strongest && <p className="mt-4 text-xs text-muted">Strongest/weakest areas appear after at least 3 answers in a category.</p>}
          </Card>
        </section>

        <section aria-label="Repeated mistakes">
          <SectionTitle>Frequently repeated mistakes</SectionTitle>
          {s.repeated.length === 0 ? (
            <EmptyState icon="🌟" title="No repeated mistakes" text="Questions you miss two or more times will be listed here." />
          ) : (
            <ul className="grid gap-3">
              {s.repeated.map((m) => (
                <li key={m.exerciseId} className="rounded-2xl border border-line bg-white p-4">
                  <p className="text-sm font-bold">{m.prompt}</p>
                  <p className="text-sm text-muted">Correct: {m.expected}</p>
                  <p className="mt-1 text-xs font-bold text-danger">Missed {m.count} times</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section aria-label="Personal bests">
        <SectionTitle>Personal bests</SectionTitle>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Card className="p-4"><p className="text-2xl font-extrabold">{bests.bestDayXp}</p><p className="text-xs text-muted">best day (XP)</p></Card>
          <Card className="p-4"><p className="text-2xl font-extrabold">{bests.longestStreak}</p><p className="text-xs text-muted">longest streak</p></Card>
          <Card className="p-4"><p className="text-2xl font-extrabold">{bests.bestLessonAccuracy ? `${Math.round(bests.bestLessonAccuracy * 100)}%` : "—"}</p><p className="text-xs text-muted">best lesson accuracy</p></Card>
        </div>
      </section>

      <section aria-label="Badges">
        <SectionTitle>Badges ({s.badges.filter((b) => b.unlocked).length}/{s.badges.length})</SectionTitle>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {s.badges.map((b) => (
            <li key={b.id} className={cn("rounded-3xl border p-4 text-center", b.unlocked ? "border-brand-dark/40 bg-brand-soft" : "border-line bg-white/60")}>
              <div className={cn("text-4xl", !b.unlocked && "opacity-30 grayscale")} aria-hidden>{b.emoji}</div>
              <p className="mt-1 text-sm font-extrabold">{b.title}</p>
              <p className="text-xs text-muted">{b.description}</p>
              <p className="sr-only">{b.unlocked ? "Unlocked" : "Locked"}</p>
            </li>
          ))}
        </ul>
      </section>

      <Notice tone="info" title="About these numbers">
        These statistics describe your practice inside this app. They are <b>not</b> a formal CEFR assessment — for an official level, take an accredited exam such as Cambridge, IELTS or TOEFL.
      </Notice>
    </div>
  );
}
