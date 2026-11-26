import type { ActivityEntry, Attempt, Category, LessonProgress } from "./types";
import { addDays, diffDays } from "./util";

export interface StreakInfo {
  current: number;
  longest: number;
  studiedToday: boolean;
  /** True when yesterday was missed but the streak is still protected. */
  atRisk: boolean;
}

/**
 * Forgiving streak: consecutive study days form a run, and a single missed
 * day never breaks it (gap ≤ 2 days between active days). Only the days that
 * were actually studied are counted.
 */
export function computeStreak(activeDates: string[], today: string): StreakInfo {
  const days = [...new Set(activeDates)].sort();
  if (days.length === 0) return { current: 0, longest: 0, studiedToday: false, atRisk: false };
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    run = prev !== null && diffDays(prev, d) <= 2 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  const last = days[days.length - 1];
  const sinceLast = diffDays(last, today);
  const alive = sinceLast <= 2;
  return {
    current: alive ? run : 0,
    longest,
    studiedToday: last === today,
    atRisk: alive && sinceLast === 2,
  };
}

export function totalXp(activity: ActivityEntry[]): number {
  return activity.reduce((s, a) => s + a.xp, 0);
}

export function xpOn(activity: ActivityEntry[], date: string): number {
  return activity.filter((a) => a.date === date).reduce((s, a) => s + a.xp, 0);
}

export function secondsOn(activity: ActivityEntry[], date: string): number {
  return activity.filter((a) => a.date === date).reduce((s, a) => s + a.seconds, 0);
}

export interface DaySummary {
  date: string;
  xp: number;
  seconds: number;
  active: boolean;
}

export function lastDays(activity: ActivityEntry[], today: string, n = 7): DaySummary[] {
  const out: DaySummary[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const entries = activity.filter((a) => a.date === date);
    out.push({
      date,
      xp: entries.reduce((s, a) => s + a.xp, 0),
      seconds: entries.reduce((s, a) => s + a.seconds, 0),
      active: entries.length > 0,
    });
  }
  return out;
}

export interface CategoryStat {
  category: Category;
  total: number;
  correct: number;
  accuracy: number;
}

export function categoryStats(attempts: Attempt[]): CategoryStat[] {
  const map = new Map<Category, { total: number; correct: number }>();
  for (const a of attempts) {
    const cur = map.get(a.category) ?? { total: 0, correct: 0 };
    cur.total += 1;
    if (a.correct) cur.correct += 1;
    map.set(a.category, cur);
  }
  return [...map.entries()].map(([category, v]) => ({
    category,
    total: v.total,
    correct: v.correct,
    accuracy: v.total === 0 ? 0 : v.correct / v.total,
  }));
}

/** Strongest/weakest require a minimum number of attempts to be meaningful. */
export function strongestWeakest(stats: CategoryStat[], minAttempts = 3) {
  const eligible = stats.filter((s) => s.total >= minAttempts).sort((a, b) => b.accuracy - a.accuracy);
  if (eligible.length < 2) return { strongest: eligible[0] ?? null, weakest: null };
  return { strongest: eligible[0], weakest: eligible[eligible.length - 1] };
}

export function overallAccuracy(attempts: Attempt[]): number | null {
  if (attempts.length === 0) return null;
  return attempts.filter((a) => a.correct).length / attempts.length;
}

/** Latest wrong answers, one per exercise. */
export function recentMistakes(attempts: Attempt[], limit = 5): Attempt[] {
  const seen = new Set<string>();
  const out: Attempt[] = [];
  const sorted = [...attempts].sort((a, b) => b.at.localeCompare(a.at));
  for (const a of sorted) {
    if (a.correct || seen.has(a.exerciseId)) continue;
    seen.add(a.exerciseId);
    out.push(a);
    if (out.length >= limit) break;
  }
  return out;
}

export interface RepeatedMistake {
  exerciseId: string;
  prompt: string;
  expected: string;
  count: number;
}

export function frequentMistakes(attempts: Attempt[], minCount = 2, limit = 5): RepeatedMistake[] {
  const map = new Map<string, RepeatedMistake>();
  for (const a of attempts) {
    if (a.correct) continue;
    const cur = map.get(a.exerciseId) ?? { exerciseId: a.exerciseId, prompt: a.prompt, expected: a.expected, count: 0 };
    cur.count += 1;
    map.set(a.exerciseId, cur);
  }
  return [...map.values()]
    .filter((m) => m.count >= minCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function personalBests(
  activity: ActivityEntry[],
  progress: Record<string, LessonProgress>,
  longestStreak: number,
) {
  const byDay = new Map<string, number>();
  for (const a of activity) byDay.set(a.date, (byDay.get(a.date) ?? 0) + a.xp);
  const bestDayXp = Math.max(0, ...byDay.values());
  const bestLessonAccuracy = Math.max(0, ...Object.values(progress).map((p) => p.bestAccuracy));
  return { bestDayXp, bestLessonAccuracy, longestStreak };
}
