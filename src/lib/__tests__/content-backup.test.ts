import { describe, expect, it } from "vitest";
import { LESSONS, validateCurriculum, isUnlocked, nextLesson, lessonIndex } from "@/content";
import { DIAGNOSTIC } from "@/content/diagnostic";
import { SCENARIOS } from "@/content/scenarios";
import { createBackup, parseBackup } from "../backup";
import { recommendPlacement } from "../placement";
import { checkGrammar, offlineTurn } from "../tutor";
import { buildDailyChallenge } from "../daily";
import { EMPTY_DATA, type AppData } from "../types";

describe("curriculum", () => {
  it("is structurally valid", () => {
    expect(validateCurriculum()).toEqual([]);
  });
  it("has expanded A1, A2 and B1 lesson sections", () => {
    expect(LESSONS.filter((l) => l.cefr === "A1").length).toBeGreaterThanOrEqual(12);
    expect(LESSONS.filter((l) => l.cefr === "A2").length).toBeGreaterThanOrEqual(4);
    expect(LESSONS.filter((l) => l.cefr === "B1").length).toBeGreaterThanOrEqual(4);
  });
  it("covers every exercise type", () => {
    const types = new Set(LESSONS.flatMap((l) => l.exercises.map((e) => e.type)));
    for (const t of ["multiple-choice", "translation", "word-order", "matching", "fill-blank", "listening", "dialogue", "sentence-construction", "reading"]) {
      expect(types.has(t as never)).toBe(true);
    }
  });
  it("locks lessons until the previous one is completed", () => {
    const settings = { startingLessonId: LESSONS[0].id };
    expect(isUnlocked(0, {}, settings)).toBe(true);
    expect(isUnlocked(1, {}, settings)).toBe(false);
    const progress = { [LESSONS[0].id]: { lessonId: LESSONS[0].id, completedAt: "", bestAccuracy: 1, bestStars: 3 as const, timesCompleted: 1, xpAwarded: 10 } };
    expect(isUnlocked(1, progress, settings)).toBe(true);
    expect(nextLesson(progress, settings)?.id).toBe(LESSONS[1].id);
  });
  it("unlocks everything up to the placement lesson", () => {
    const settings = { startingLessonId: "a1-routine" };
    const startIndex = lessonIndex(settings.startingLessonId);
    expect(isUnlocked(startIndex, {}, settings)).toBe(true);
    expect(isUnlocked(startIndex + 1, {}, settings)).toBe(false);
  });
  it("daily challenge is deterministic for a date", () => {
    const s = { startingLessonId: "a1-greetings" };
    const a = buildDailyChallenge("2025-03-10", {}, s).exercises.map((e) => e.id);
    const b = buildDailyChallenge("2025-03-10", {}, s).exercises.map((e) => e.id);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
  });
});

describe("placement", () => {
  it("recommends a start from diagnostic answers", () => {
    const all = (n: number) => DIAGNOSTIC.map((q, i) => ({ cefr: q.cefr, correct: i < n }));
    expect(recommendPlacement(all(0)).lessonId).toBe("a1-greetings");
    expect(recommendPlacement(DIAGNOSTIC.map((q) => ({ cefr: q.cefr, correct: q.cefr === "A1" }))).lessonId).toBe("a1-routine");
    expect(recommendPlacement(DIAGNOSTIC.map((q) => ({ cefr: q.cefr, correct: q.cefr !== "B1" }))).lessonId).toBe("a2-weekend-past");
    expect(recommendPlacement(all(10)).lessonId).toBe("b1-work-meetings");
  });
});

describe("offline tutor", () => {
  it("catches common mistakes with Portuguese explanations", () => {
    const c = checkGrammar("i am agree and he don't like it");
    expect(c.map((x) => x.corrected)).toEqual(expect.arrayContaining(["I agree", "he doesn't", "I"]));
    expect(checkGrammar("My name is Ana.")).toEqual([]);
  });
  it("every scenario advances and finishes", () => {
    for (const s of SCENARIOS) {
      expect(s.steps.length).toBeGreaterThanOrEqual(5);
      const last = offlineTurn(s, s.steps.length - 1, s.steps[s.steps.length - 1].model, "friendly", "beginner");
      expect(last.done).toBe(true);
      const first = offlineTurn(s, 0, s.steps[0].model, "coach", "advanced");
      expect(first.feedback.onTopic).toBe(true);
    }
  });
});

describe("backup", () => {
  const data: AppData = {
    ...EMPTY_DATA,
    vocab: [{ id: "1", word: "hi", translation: "oi", example: "", exampleTranslation: "", context: "", familiarity: 0, lastReviewed: null, nextReview: "2025-01-01T00:00:00.000Z", correct: 0, incorrect: 0, source: "manual", createdAt: "2025-01-01T00:00:00.000Z" }],
    activity: [{ id: "a", date: "2025-01-01", at: "2025-01-01T00:00:00.000Z", xp: 10, seconds: 60, kind: "lesson" }],
  };
  it("round-trips", () => {
    const parsed = parseBackup(JSON.parse(JSON.stringify(createBackup(data))));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.data.vocab).toHaveLength(1);
  });
  it("rejects invalid files", () => {
    expect(parseBackup(null).ok).toBe(false);
    expect(parseBackup({ app: "other" }).ok).toBe(false);
    const bad = JSON.parse(JSON.stringify(createBackup(data)));
    bad.data.vocab[0].familiarity = "high";
    expect(parseBackup(bad).ok).toBe(false);
    const missing = JSON.parse(JSON.stringify(createBackup(data)));
    delete missing.data.attempts;
    expect(parseBackup(missing).ok).toBe(false);
  });
  it("rejects duplicate keys rather than silently overwriting imported records", () => {
    const backup = createBackup({ ...data, vocab: [...data.vocab, { ...data.vocab[0], word: "hello again" }] });
    const parsed = parseBackup(backup);
    expect(parsed).toMatchObject({ ok: false, error: "Duplicate vocabulary IDs are not allowed." });
  });
});
