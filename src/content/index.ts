import type { Exercise, Lesson, LessonProgress, Settings } from "@/lib/types";
import { a1Part1 } from "./a1-part1";
import { a1Part2 } from "./a1-part2";
import { a2b1 } from "./a2-b1";

/** The full ordered curriculum. Static, validated data: never generated at render time. */
export const LESSONS: Lesson[] = [...a1Part1, ...a1Part2, ...a2b1];

const byId = new Map(LESSONS.map((l) => [l.id, l]));

export function getLesson(id: string): Lesson | undefined {
  return byId.get(id);
}

export function lessonIndex(id: string): number {
  return LESSONS.findIndex((l) => l.id === id);
}

export function allExercises(): Exercise[] {
  return LESSONS.flatMap((l) => l.exercises);
}

export function isUnlocked(
  index: number,
  progress: Record<string, LessonProgress>,
  settings: Pick<Settings, "startingLessonId">,
): boolean {
  if (index <= 0) return true;
  const start = Math.max(0, lessonIndex(settings.startingLessonId));
  if (index <= start) return true;
  return Boolean(progress[LESSONS[index - 1].id]);
}

/** First unlocked lesson that has not been completed yet. */
export function nextLesson(
  progress: Record<string, LessonProgress>,
  settings: Pick<Settings, "startingLessonId">,
): Lesson | null {
  for (let i = 0; i < LESSONS.length; i++) {
    if (isUnlocked(i, progress, settings) && !progress[LESSONS[i].id]) return LESSONS[i];
  }
  return null;
}

/* ---------- Validation ---------- */

/** Returns a list of problems found in a lesson (empty list = valid). */
export function validateLesson(l: Lesson): string[] {
  const errors: string[] = [];
  const err = (msg: string) => errors.push(`${l.id}: ${msg}`);
  if (!l.title || !l.objective || !l.objectivePt) err("missing title or objective");
  if (l.vocabulary.length < 5) err("needs at least 5 vocabulary entries");
  if (l.exercises.length < 8) err("needs at least 8 exercises");
  if (l.xp <= 0) err("xp must be positive");
  const ids = new Set<string>();
  for (const ex of l.exercises) {
    if (ids.has(ex.id)) err(`duplicate exercise id ${ex.id}`);
    ids.add(ex.id);
    if (!ex.explanation.trim()) err(`${ex.id} has no Portuguese explanation`);
    switch (ex.type) {
      case "multiple-choice":
      case "fill-blank":
      case "dialogue":
      case "reading":
        if (!ex.options.includes(ex.answer)) err(`${ex.id} answer is not among the options`);
        if (new Set(ex.options).size !== ex.options.length) err(`${ex.id} has duplicate options`);
        if (ex.options.length < 3) err(`${ex.id} needs at least 3 options`);
        if (ex.type === "fill-blank" && !ex.sentence.includes("___")) err(`${ex.id} has no blank`);
        if (ex.type === "dialogue" && !ex.lines.some((x) => x.text.includes("___"))) err(`${ex.id} has no blank line`);
        break;
      case "translation":
        if (ex.answers.length === 0) err(`${ex.id} has no accepted answers`);
        break;
      case "word-order":
      case "sentence-construction":
        if (ex.answer.split(" ").length < 2) err(`${ex.id} answer too short`);
        break;
      case "matching":
        if (ex.pairs.length < 3) err(`${ex.id} needs at least 3 pairs`);
        if (new Set(ex.pairs.map((p) => p.en)).size !== ex.pairs.length) err(`${ex.id} has duplicate pairs`);
        break;
      case "listening":
        if (ex.mode === "choose" && !ex.options.includes(ex.text)) err(`${ex.id} text is not among the options`);
        if (ex.mode === "type" && ex.answers.length === 0) err(`${ex.id} has no accepted answers`);
        break;
    }
  }
  return errors;
}

export function validateCurriculum(lessons: Lesson[] = LESSONS): string[] {
  const errors = lessons.flatMap(validateLesson);
  const ids = lessons.map((l) => l.id);
  if (new Set(ids).size !== ids.length) errors.push("duplicate lesson ids");
  return errors;
}
