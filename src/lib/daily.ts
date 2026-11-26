import { isUnlocked, LESSONS } from "@/content";
import type { Exercise, Lesson, LessonProgress, Settings } from "./types";
import { dateKey, seededShuffle } from "./util";

export const DAILY_PREFIX = "daily-";
export const dailyId = (date: string) => `${DAILY_PREFIX}${date}`;

/**
 * Deterministic daily challenge: 5 exercises picked (seeded by the date) from
 * the lessons that were unlocked at the start of today, so it never changes
 * mid-day and is never random between renders.
 */
export function buildDailyChallenge(date: string, progress: Record<string, LessonProgress>, settings: Pick<Settings, "startingLessonId">): Lesson {
  const before: Record<string, LessonProgress> = {};
  for (const [id, p] of Object.entries(progress)) {
    if (!id.startsWith(DAILY_PREFIX) && dateKey(new Date(p.completedAt)) < date) before[id] = p;
  }
  const pool: Exercise[] = LESSONS.flatMap((l, i) => (isUnlocked(i, before, settings) ? l.exercises : [])).filter((e) => e.type !== "matching");
  const exercises = seededShuffle(pool, `daily-${date}`).slice(0, 5);
  return {
    id: dailyId(date),
    unit: "Daily challenge",
    title: "Daily challenge",
    titlePt: "Desafio diário",
    cefr: "A1",
    emoji: "🎯",
    objective: "A short mixed review of lessons you have unlocked.",
    objectivePt: "Uma revisão rápida e variada das lições que você já desbloqueou.",
    xp: 20,
    vocabulary: [],
    exercises,
  };
}
