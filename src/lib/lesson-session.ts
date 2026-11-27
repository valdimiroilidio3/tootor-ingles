import { MAX_HEARTS } from "./scoring";
import type { Lesson, LessonSession, LessonSessionAnswer, MatchingDraft, Response } from "./types";

export type SessionValidation =
  | { ok: true; session: LessonSession }
  | { ok: false; reason: "invalid" | "incompatible" };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isText = (value: unknown, max = 10_000): value is string => typeof value === "string" && value.length <= max;
const isResponse = (value: unknown): value is Response =>
  value === null || isText(value) || (Array.isArray(value) && value.length <= 100 && value.every((part) => isText(part, 1_000)));

function isMatchingDraft(value: unknown, lesson: Lesson, index: number): value is MatchingDraft | undefined {
  if (value === undefined) return true;
  const exercise = lesson.exercises[index];
  if (!isRecord(value) || exercise?.type !== "matching") return false;
  const validPairs = new Set(exercise.pairs.map((pair) => `${pair.en}::${pair.pt}`));
  const english = new Set(exercise.pairs.map((pair) => pair.en));
  return (
    Array.isArray(value.matchedPairs) &&
    value.matchedPairs.every((pair) => typeof pair === "string" && validPairs.has(pair)) &&
    new Set(value.matchedPairs).size === value.matchedPairs.length &&
    (value.selectedEnglish === null || (typeof value.selectedEnglish === "string" && english.has(value.selectedEnglish))) &&
    Number.isInteger(value.mistakes) &&
    Number(value.mistakes) >= 0 &&
    Number(value.mistakes) <= 10_000
  );
}

function isAnswer(value: unknown, lesson: Lesson, index: number): value is LessonSessionAnswer {
  if (!isRecord(value)) return false;
  const exercise = lesson.exercises[index];
  return Boolean(
    exercise &&
      value.exerciseId === exercise.id &&
      value.category === exercise.category &&
      value.type === exercise.type &&
      typeof value.correct === "boolean" &&
      isText(value.answer) &&
      isText(value.expected) &&
      isText(value.prompt),
  );
}

/** Validates persisted data against the current lesson before any checkpoint is offered for recovery. */
export function validateLessonSession(value: unknown, lesson: Lesson): SessionValidation {
  if (!isRecord(value) || value.lessonId !== lesson.id) return { ok: false, reason: "invalid" };
  if (value.version !== 1) return { ok: false, reason: "incompatible" };
  if (
    (value.status !== "in-progress" && value.status !== "failed") ||
    !Number.isInteger(value.exerciseIndex) ||
    Number(value.exerciseIndex) < 0 ||
    Number(value.exerciseIndex) >= lesson.exercises.length ||
    !Number.isInteger(value.heartsLeft) ||
    Number(value.heartsLeft) < 0 ||
    Number(value.heartsLeft) > MAX_HEARTS ||
    !Array.isArray(value.results) ||
    value.results.length > Number(value.exerciseIndex) + 1 ||
    !value.results.every((answer, index) => isAnswer(answer, lesson, index)) ||
    !isResponse(value.draft) ||
    !isMatchingDraft(value.matchingDraft, lesson, Number(value.exerciseIndex)) ||
    typeof value.elapsedSeconds !== "number" ||
    !Number.isFinite(value.elapsedSeconds) ||
    value.elapsedSeconds < 0 ||
    value.elapsedSeconds > 25 * 60 ||
    typeof value.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(value.updatedAt))
  ) {
    return { ok: false, reason: "invalid" };
  }
  if (value.status === "failed" && Number(value.heartsLeft) !== 0) return { ok: false, reason: "invalid" };
  return { ok: true, session: value as unknown as LessonSession };
}
