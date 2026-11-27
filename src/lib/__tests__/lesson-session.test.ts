import { describe, expect, it } from "vitest";
import { LESSONS } from "@/content";
import { MAX_HEARTS } from "../scoring";
import { validateLessonSession } from "../lesson-session";
import type { Lesson, LessonSession } from "../types";

const lesson = LESSONS[0] as Lesson;
const session = (overrides: Partial<LessonSession> = {}): LessonSession => ({
  lessonId: lesson.id,
  version: 1,
  status: "in-progress",
  exerciseIndex: 0,
  results: [],
  heartsLeft: MAX_HEARTS,
  draft: null,
  elapsedSeconds: 12,
  updatedAt: "2026-11-26T12:00:00.000Z",
  ...overrides,
});

describe("lesson session validation", () => {
  it("accepts a current checkpoint with an answer draft", () => {
    expect(validateLessonSession(session({ draft: "Good morning" }), lesson)).toMatchObject({ ok: true, session: { draft: "Good morning" } });
  });

  it("restores a submitted result only for the corresponding exercise", () => {
    const exercise = lesson.exercises[0];
    const result = { exerciseId: exercise.id, category: exercise.category, type: exercise.type, correct: false, answer: "wrong", expected: "right", prompt: "Choose" };
    expect(validateLessonSession(session({ results: [result] }), lesson).ok).toBe(true);
    expect(validateLessonSession(session({ results: [{ ...result, exerciseId: "unknown" }] }), lesson)).toMatchObject({ ok: false, reason: "invalid" });
  });

  it("preserves compatibility information and rejects malformed or out-of-range state", () => {
    expect(validateLessonSession({ ...session(), version: 42 }, lesson)).toMatchObject({ ok: false, reason: "incompatible" });
    expect(validateLessonSession(session({ exerciseIndex: lesson.exercises.length }), lesson)).toMatchObject({ ok: false, reason: "invalid" });
    expect(validateLessonSession(session({ heartsLeft: -1 }), lesson)).toMatchObject({ ok: false, reason: "invalid" });
    expect(validateLessonSession(session({ updatedAt: "not-a-date" }), lesson)).toMatchObject({ ok: false, reason: "invalid" });
  });

  it("restores matching selections but rejects pairs not present in the lesson", () => {
    const matchingLesson = LESSONS.find((item) => item.exercises.some((exercise) => exercise.type === "matching"))!;
    const index = matchingLesson.exercises.findIndex((exercise) => exercise.type === "matching");
    const matchingExercise = matchingLesson.exercises[index];
    if (matchingExercise.type !== "matching") throw new Error("Expected matching exercise");
    const valid = session({ lessonId: matchingLesson.id, exerciseIndex: index, matchingDraft: { matchedPairs: [`${matchingExercise.pairs[0].en}::${matchingExercise.pairs[0].pt}`], selectedEnglish: matchingExercise.pairs[1].en, mistakes: 1 } });
    expect(validateLessonSession(valid, matchingLesson).ok).toBe(true);
    expect(validateLessonSession({ ...valid, matchingDraft: { ...valid.matchingDraft!, matchedPairs: ["invalid::pair"] } }, matchingLesson)).toMatchObject({ ok: false, reason: "invalid" });
  });
});
