import type { VocabEntry, VocabItem } from "./types";
import { uid } from "./util";

/** Days until next review for each familiarity level (0 = new / forgotten). */
export const INTERVAL_DAYS = [0, 1, 2, 4, 8, 16, 32] as const;
export const MAX_FAMILIARITY = INTERVAL_DAYS.length - 1;
export type Grade = "again" | "hard" | "good" | "easy";

const DAY_MS = 86_400_000;
const AGAIN_DELAY_MS = 10 * 60_000;

export function createVocabItem(
  entry: Partial<VocabEntry> & Pick<VocabEntry, "word" | "translation">,
  source: VocabItem["source"],
  now: Date = new Date(),
): VocabItem {
  return {
    id: uid(),
    word: entry.word.trim(),
    translation: entry.translation.trim(),
    example: entry.example?.trim() ?? "",
    exampleTranslation: entry.exampleTranslation?.trim() ?? "",
    context: entry.context?.trim() ?? "",
    familiarity: 0,
    lastReviewed: null,
    nextReview: now.toISOString(),
    correct: 0,
    incorrect: 0,
    source,
    createdAt: now.toISOString(),
  };
}

/** Pure scheduling step: returns the updated item after a review. */
export function reviewItem(item: VocabItem, grade: Grade, now: Date = new Date()): VocabItem {
  let familiarity = item.familiarity;
  let delayMs: number;
  switch (grade) {
    case "again":
      familiarity = Math.max(0, familiarity - 2);
      delayMs = AGAIN_DELAY_MS;
      break;
    case "hard":
      familiarity = Math.max(1, familiarity);
      delayMs = Math.max(1, Math.round(INTERVAL_DAYS[familiarity] * 0.6)) * DAY_MS;
      break;
    case "good":
      familiarity = Math.min(MAX_FAMILIARITY, familiarity + 1);
      delayMs = INTERVAL_DAYS[familiarity] * DAY_MS;
      break;
    case "easy":
      familiarity = Math.min(MAX_FAMILIARITY, familiarity + 2);
      delayMs = INTERVAL_DAYS[familiarity] * DAY_MS;
      break;
  }
  const failed = grade === "again";
  return {
    ...item,
    familiarity,
    lastReviewed: now.toISOString(),
    nextReview: new Date(now.getTime() + delayMs).toISOString(),
    correct: item.correct + (failed ? 0 : 1),
    incorrect: item.incorrect + (failed ? 1 : 0),
  };
}

export function isDue(item: VocabItem, now: Date = new Date()): boolean {
  return new Date(item.nextReview).getTime() <= now.getTime();
}

export function isNew(item: VocabItem): boolean {
  return item.lastReviewed === null;
}

/** Higher score = should be reviewed sooner. Non-due items get a negative score. */
export function priorityScore(item: VocabItem, now: Date = new Date()): number {
  const overdueDays = (now.getTime() - new Date(item.nextReview).getTime()) / DAY_MS;
  const attempts = item.correct + item.incorrect;
  const missRate = attempts === 0 ? 0 : item.incorrect / attempts;
  let score = (MAX_FAMILIARITY - item.familiarity) * 3 + missRate * 30;
  if (isNew(item)) score += 40;
  if (overdueDays >= 0) score += 20 + Math.min(overdueDays, 30) * 2;
  else score = -1000 + overdueDays;
  return score;
}

export function getReviewQueue(items: VocabItem[], now: Date = new Date(), limit = 20): VocabItem[] {
  return items
    .filter((i) => isDue(i, now))
    .sort((a, b) => priorityScore(b, now) - priorityScore(a, now))
    .slice(0, limit);
}

export function countDue(items: VocabItem[], now: Date = new Date()): number {
  return items.filter((i) => isDue(i, now)).length;
}

export function familiarityLabel(f: number): string {
  if (f <= 0) return "New";
  if (f <= 2) return "Learning";
  if (f <= 4) return "Familiar";
  return "Mastered";
}

export function isLearned(item: VocabItem): boolean {
  return item.familiarity >= 3;
}

export function isDifficult(item: VocabItem): boolean {
  return item.incorrect >= 2 && item.incorrect >= item.correct;
}
