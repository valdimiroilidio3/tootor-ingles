import { describe, expect, it } from "vitest";
import { createVocabItem, getReviewQueue, INTERVAL_DAYS, isDue, priorityScore, reviewItem } from "../srs";
import { computeStreak, frequentMistakes, recentMistakes, strongestWeakest, categoryStats } from "../stats";
import { addDays } from "../util";
import type { Attempt } from "../types";

const NOW = new Date("2025-03-10T12:00:00Z");
const DAY = 86_400_000;
const item = () => createVocabItem({ word: "hello", translation: "olá" }, "manual", NOW);

describe("spaced repetition", () => {
  it("new items are due immediately", () => {
    expect(isDue(item(), NOW)).toBe(true);
  });
  it("intervals grow progressively with consecutive good answers", () => {
    let it = item();
    const gaps: number[] = [];
    for (let i = 0; i < 6; i++) {
      it = reviewItem(it, "good", NOW);
      gaps.push(Math.round((new Date(it.nextReview).getTime() - NOW.getTime()) / DAY));
    }
    expect(gaps).toEqual([...INTERVAL_DAYS].slice(1));
    expect(gaps).toEqual([...gaps].sort((a, b) => a - b));
  });
  it("again resets familiarity and reschedules within minutes", () => {
    let it = item();
    it = reviewItem(reviewItem(reviewItem(it, "good", NOW), "good", NOW), "good", NOW);
    const failed = reviewItem(it, "again", NOW);
    expect(failed.familiarity).toBe(it.familiarity - 2);
    expect(failed.incorrect).toBe(1);
    expect(new Date(failed.nextReview).getTime() - NOW.getTime()).toBeLessThan(DAY);
  });
  it("easy jumps further than good and counters are tracked", () => {
    const g = reviewItem(item(), "good", NOW);
    const e = reviewItem(item(), "easy", NOW);
    expect(e.familiarity).toBeGreaterThan(g.familiarity);
    expect(g.correct).toBe(1);
  });
  it("prioritises new, overdue and often-missed words", () => {
    const fresh = item();
    const reviewed = { ...reviewItem(item(), "good", NOW), nextReview: new Date(NOW.getTime() - DAY).toISOString() };
    const missed = { ...reviewed, correct: 1, incorrect: 5, familiarity: 1 };
    const future = { ...reviewed, id: "future", nextReview: new Date(NOW.getTime() + 5 * DAY).toISOString() };
    missed.id = "missed";
    expect(priorityScore(fresh, NOW)).toBeGreaterThan(priorityScore(reviewed, NOW));
    expect(priorityScore(missed, NOW)).toBeGreaterThan(priorityScore(reviewed, NOW));
    expect(getReviewQueue([future, reviewed, missed, fresh], NOW).map((x) => x.id)).not.toContain(future.id);
    expect(getReviewQueue([future, reviewed, missed, fresh], NOW)[0].id).toBe(fresh.id);
  });
});

describe("streaks", () => {
  const today = "2025-03-10";
  it("counts consecutive days", () => {
    const s = computeStreak(["2025-03-08", "2025-03-09", "2025-03-10"], today);
    expect(s).toMatchObject({ current: 3, longest: 3, studiedToday: true });
  });
  it("forgives a single missed day", () => {
    const s = computeStreak(["2025-03-07", "2025-03-09"], today);
    expect(s.current).toBe(2);
    expect(s.atRisk).toBe(false);
  });
  it("keeps the streak alive for one missed day but resets after two", () => {
    expect(computeStreak(["2025-03-08"], today)).toMatchObject({ current: 1, atRisk: true });
    expect(computeStreak(["2025-03-07"], today).current).toBe(0);
  });
  it("handles empty history and tracks longest run", () => {
    expect(computeStreak([], today)).toMatchObject({ current: 0, longest: 0 });
    expect(computeStreak(["2025-01-01", "2025-01-02", "2025-01-03", "2025-03-10"], today)).toMatchObject({ current: 1, longest: 3 });
  });
  it("does not double count duplicate dates", () => {
    expect(computeStreak([today, today, addDays(today, -1)], today).current).toBe(2);
  });
});

describe("mistake analytics", () => {
  const mk = (exerciseId: string, correct: boolean, at: string, category: Attempt["category"] = "grammar"): Attempt => ({
    id: `${exerciseId}-${at}`, lessonId: "l", exerciseId, category, type: "fill-blank", correct, answer: "x", expected: "y", prompt: "p", at,
  });
  const attempts = [mk("a", false, "2025-01-01"), mk("a", false, "2025-01-02"), mk("b", false, "2025-01-03"), mk("c", true, "2025-01-04")];
  it("lists recent mistakes uniquely, newest first", () => {
    expect(recentMistakes(attempts).map((m) => m.exerciseId)).toEqual(["b", "a"]);
  });
  it("finds repeated mistakes", () => {
    expect(frequentMistakes(attempts)).toEqual([expect.objectContaining({ exerciseId: "a", count: 2 })]);
  });
  it("needs enough attempts for strongest/weakest", () => {
    const many = [...Array(3)].map((_, i) => mk(`g${i}`, true, "2025-01-01", "grammar")).concat([...Array(3)].map((_, i) => mk(`v${i}`, i === 0, "2025-01-01", "vocabulary")));
    const sw = strongestWeakest(categoryStats(many));
    expect(sw.strongest?.category).toBe("grammar");
    expect(sw.weakest?.category).toBe("vocabulary");
    expect(strongestWeakest(categoryStats(attempts.slice(0, 2))).strongest).toBeNull();
  });
});
