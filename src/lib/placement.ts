import type { Cefr, Level } from "./types";

export interface PlacementAnswer {
  cefr: Cefr;
  correct: boolean;
}

export interface Placement {
  level: Level;
  /** Lesson id to start from. */
  lessonId: string;
  correct: number;
  total: number;
  summary: string;
}

const START: Record<"beginner" | "late-a1" | "a2" | "b1", string> = {
  beginner: "a1-greetings",
  "late-a1": "a1-routine",
  a2: "a2-weekend-past",
  b1: "b1-work-meetings",
};

/**
 * Suggests a starting lesson from a short diagnostic. This is a study
 * recommendation, NOT a formal CEFR assessment.
 */
export function recommendPlacement(answers: PlacementAnswer[]): Placement {
  const count = (c: Cefr) => answers.filter((a) => a.cefr === c && a.correct).length;
  const a1 = count("A1");
  const a2 = count("A2");
  const b1 = count("B1");
  const correct = a1 + a2 + b1;
  const total = answers.length;
  if (a1 >= 3 && a2 >= 2 && b1 >= 2) {
    return { level: "advanced", lessonId: START.b1, correct, total, summary: "You answered most questions correctly, including B1-style ones. Start with the B1 lessons." };
  }
  if (a1 >= 3 && a2 >= 2) {
    return { level: "intermediate", lessonId: START.a2, correct, total, summary: "A1 basics look solid. Start with the A2 lessons to build everyday fluency." };
  }
  if (a1 >= 3) {
    return { level: "elementary", lessonId: START["late-a1"], correct, total, summary: "You know many basics. Start in the middle of A1 to fill the remaining gaps." };
  }
  return { level: "beginner", lessonId: START.beginner, correct, total, summary: "Starting from the very first lesson will give you a strong foundation." };
}
