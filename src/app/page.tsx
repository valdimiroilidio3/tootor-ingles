"use client";

import Link from "next/link";
import { ArrowRight, Calendar, Flame, Layers, Target, Trophy, Zap } from "lucide-react";
import { useReadyApp } from "@/components/AppProvider";
import { LearningPath } from "@/components/LearningPath";
import { Mascot, type MascotMood } from "@/components/Mascot";
import { Card, EmptyState, LinkButton, Pill, ProgressBar, SectionTitle, StatTile } from "@/components/ui";
import { dailyId } from "@/lib/daily";
import { recentMistakes } from "@/lib/stats";
import { useDerived } from "@/lib/useDerived";
import { addDays, cn, formatDuration } from "@/lib/util";

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Late night study" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export default function Dashboard() {
  const { data, settings } = useReadyApp();
  const d = useDerived();
  if (!d) return null;

  const mistakes = recentMistakes(data.attempts, 4);
  const weekXp = d.week.reduce((s, x) => s + x.xp, 0);
  const weekSeconds = d.week.reduce((s, x) => s + x.seconds, 0);
  const activeDays = d.week.filter((x) => x.active).length;
  const weekStart = addDays(d.today, -6);
  const weekLessons = Object.values(data.progress).filter((p) => !p.lessonId.startsWith("daily-") && p.completedAt.slice(0, 10) >= weekStart).length;
  const dailyDone = Boolean(data.progress[dailyId(d.today)]);

  let mood: MascotMood = "happy";
  let message = "Ready when you are. Even five minutes counts!";
  if (d.goalMet) {
    mood = "cheer";
    message = "Daily goal reached — fantastic work!";
  } else if (d.due > 0) {
    mood = "thinking";
    message = `${d.due} ${d.due === 1 ? "word is" : "words are"} waiting for review.`;
  } else if (d.streak.atRisk) {
    message = "Yesterday was quiet — study today to keep your streak going.";
  } else if (d.xpToday > 0) {
    message = `${d.goal - d.xpToday} XP to go for today's goal.`;
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="grid gap-6 rounded-[2rem] bg-brand p-6 shadow-soft md:grid-cols-[1fr_auto] md:items-center md:p-8" aria-label="Today">
        <div>
          <Pill className="bg-ink text-white">Learning English · from Portuguese</Pill>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">{greeting()}!</h1>
          <p className="mt-2 max-w-md text-[17px] font-medium text-ink/80">{message}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {d.next ? (
              <LinkButton href={`/lesson/${d.next.id}`} variant="dark" size="lg">
                Continue learning <ArrowRight className="size-5" aria-hidden />
              </LinkButton>
            ) : (
              <LinkButton href="/practice" variant="dark" size="lg">
                Course complete — practise <ArrowRight className="size-5" aria-hidden />
              </LinkButton>
            )}
            {d.next && <p className="self-center text-sm font-bold text-ink/80">Next: {d.next.title}</p>}
          </div>
        </div>
        <div className="mx-auto md:mx-0">
          <Mascot mood={mood} size={150} />
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Your stats">
        <StatTile icon={<Flame className="size-4" />} label="Streak" value={`${d.streak.current}`} hint={d.streak.current === 1 ? "day" : "days"} />
        <StatTile icon={<Zap className="size-4" />} label="Total XP" value={d.xp} hint={`Level ${d.level.level}`} />
        <StatTile icon={<Trophy className="size-4" />} label="Level" value={d.level.level} hint={`${d.level.current}/${d.level.needed} XP to next`} />
        <StatTile icon={<Target className="size-4" />} label="Today" value={formatDuration(d.secondsToday)} hint="study time" />
      </section>

      {/* Daily goal */}
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <p className="font-extrabold">Daily XP goal</p>
          <p className="text-sm font-bold">
            {Math.min(d.xpToday, d.goal)} / {d.goal} XP
          </p>
        </div>
        <ProgressBar value={(d.xpToday / d.goal) * 100} label="Daily XP goal" tone={d.goalMet ? "success" : "brand"} />
        <p className="mt-2 text-sm text-muted">Based on your {settings.dailyMinutes}-minute daily goal. Missing a single day never resets your streak.</p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <section aria-label="Learning path">
            <SectionTitle action={<Link href="/learn" className="text-sm font-bold underline">Full path</Link>}>Your path</SectionTitle>
            <Card className="bg-white/70 p-3">
              <LearningPath preview={4} />
            </Card>
          </section>
        </div>

        <div className="space-y-6">
          <Card className="bg-ink text-white">
            <p className="text-xs font-extrabold uppercase tracking-widest text-brand">Daily challenge</p>
            <p className="mt-1 text-xl font-extrabold">{dailyDone ? "Challenge complete 🎉" : "5 mixed questions"}</p>
            <p className="mt-1 text-sm text-white/70">{dailyDone ? "Come back tomorrow for a new one." : "A quick review of lessons you have unlocked. XP is awarded once per day."}</p>
            <LinkButton href={`/lesson/${dailyId(d.today)}`} variant="primary" className="mt-4">
              {dailyDone ? "Practise again" : "Start challenge"}
            </LinkButton>
          </Card>

          <Card>
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand"><Layers className="size-5" aria-hidden /></span>
              <div className="flex-1">
                <p className="font-extrabold">Vocabulary review</p>
                {data.vocab.length === 0 ? (
                  <p className="text-sm text-muted">Complete a lesson to add words to your notebook.</p>
                ) : d.due > 0 ? (
                  <p className="text-sm text-muted">{d.due} {d.due === 1 ? "word is" : "words are"} due for review.</p>
                ) : (
                  <p className="text-sm text-muted">All caught up. {data.vocab.length} words saved.</p>
                )}
              </div>
            </div>
            {d.due > 0 && (
              <LinkButton href="/review" className="mt-4 w-full">
                Review {d.due} {d.due === 1 ? "word" : "words"}
              </LinkButton>
            )}
          </Card>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-label="Recent mistakes">
          <SectionTitle>Recent mistakes</SectionTitle>
          {mistakes.length === 0 ? (
            <EmptyState icon="✅" title="No mistakes yet" text="Wrong answers from your lessons will show up here so you can learn from them." />
          ) : (
            <ul className="grid gap-3">
              {mistakes.map((m) => (
                <li key={m.id} className="rounded-2xl border border-line bg-white p-4">
                  <p className="text-sm font-bold">{m.prompt}</p>
                  <p className="mt-1 text-sm"><span className="font-bold text-danger">You:</span> {m.answer || "—"}</p>
                  <p className="text-sm"><span className="font-bold text-[#1d6b3c]">Correct:</span> {m.expected}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="This week">
          <SectionTitle action={<Link href="/progress" className="text-sm font-bold underline">Details</Link>}>This week</SectionTitle>
          <Card>
            <div className="grid grid-cols-7 gap-1.5" role="list" aria-label="Last 7 days">
              {d.week.map((day) => {
                const label = DAY_LABELS[new Date(`${day.date}T12:00:00`).getDay()];
                return (
                  <div key={day.date} role="listitem" className="flex flex-col items-center gap-1.5" aria-label={`${day.date}: ${day.active ? `${day.xp} XP` : "no study"}`}>
                    <span className="text-xs font-bold text-muted">{label}</span>
                    <span className={cn("grid size-9 place-items-center rounded-full text-xs font-extrabold", day.active ? "bg-brand" : "bg-ink/5 text-muted", day.date === d.today && "ring-2 ring-ink")}>
                      {day.active ? day.xp : <Calendar className="size-3.5 opacity-40" aria-hidden />}
                    </span>
                  </div>
                );
              })}
            </div>
            <dl className="mt-5 grid grid-cols-4 gap-2 text-center">
              {[
                ["XP", weekXp],
                ["Time", formatDuration(weekSeconds)],
                ["Lessons", weekLessons],
                ["Days", `${activeDays}/7`],
              ].map(([k, v]) => (
                <div key={k as string} className="rounded-2xl bg-cream p-2">
                  <dd className="text-lg font-extrabold">{v}</dd>
                  <dt className="text-xs text-muted">{k}</dt>
                </div>
              ))}
            </dl>
          </Card>
        </section>
      </div>
    </div>
  );
}
