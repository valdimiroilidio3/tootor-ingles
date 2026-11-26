import type { DailyMinutes } from "./types";

/** Level n starts at 50·(n-1)² XP: 0, 50, 200, 450, 800 … */
export function xpForLevel(level: number): number {
  return 50 * (level - 1) ** 2;
}

export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;
}

export function levelProgress(xp: number) {
  const level = levelFromXp(xp);
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  const current = Math.max(0, xp) - floor;
  const needed = ceil - floor;
  return { level, current, needed, pct: Math.min(100, Math.round((current / needed) * 100)) };
}

/** Daily XP goal derived from the chosen study minutes. */
export function dailyXpGoal(minutes: DailyMinutes): number {
  return minutes * 4;
}

/**
 * XP for completing a lesson: full base XP for a perfect run, down to 60 %
 * for a run with many mistakes. Never negative — mistakes are not punished.
 */
export function lessonXp(baseXp: number, accuracy: number): number {
  const a = Math.min(1, Math.max(0, accuracy));
  return Math.max(1, Math.round(baseXp * (0.6 + 0.4 * a)));
}

/** XP for finishing a review session: 1 per correctly recalled due card, capped. */
export function reviewXp(correctDueCards: number): number {
  return Math.min(20, Math.max(0, correctDueCards));
}
