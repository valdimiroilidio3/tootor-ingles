import type { Category, Cefr, Exercise, Lesson, VocabEntry } from "@/lib/types";

type Draft<T> = T extends unknown ? Omit<T, "id"> : never;
export type ExerciseDraft = Draft<Exercise>;

type VocabTuple = [word: string, translation: string, example: string, exampleTranslation: string, context: string];

/** Multiple choice: the correct answer is passed separately; the UI shuffles deterministically. */
export const mc = (prompt: string, answer: string, wrong: string[], explanation: string, category: Category = "vocabulary"): ExerciseDraft => ({
  type: "multiple-choice",
  category,
  prompt,
  options: [answer, ...wrong],
  answer,
  explanation,
});

export const tr = (prompt: string, answers: string[], explanation: string, direction: "pt-en" | "en-pt" = "pt-en"): ExerciseDraft => ({
  type: "translation",
  category: "vocabulary",
  prompt,
  direction,
  answers,
  explanation,
});

export const wo = (promptPt: string, answer: string, explanation: string): ExerciseDraft => ({
  type: "word-order",
  category: "grammar",
  promptPt,
  answer,
  alternatives: [],
  distractors: [],
  explanation,
});

export const sc = (promptPt: string, answer: string, distractors: string[], explanation: string): ExerciseDraft => ({
  type: "sentence-construction",
  category: "grammar",
  promptPt,
  answer,
  alternatives: [],
  distractors,
  explanation,
});

export const match = (pairs: [string, string][], explanation = "Revise o vocabulário da lição: associe cada expressão em inglês à tradução."): ExerciseDraft => ({
  type: "matching",
  category: "vocabulary",
  pairs: pairs.map(([en, pt]) => ({ en, pt })),
  explanation,
});

export const fill = (sentence: string, translation: string, answer: string, wrong: string[], explanation: string): ExerciseDraft => ({
  type: "fill-blank",
  category: "grammar",
  sentence,
  translation,
  options: [answer, ...wrong],
  answer,
  explanation,
});

export const listenType = (text: string, explanation: string, extraAnswers: string[] = []): ExerciseDraft => ({
  type: "listening",
  category: "listening",
  text,
  mode: "type",
  options: [],
  answers: [text, ...extraAnswers],
  explanation,
});

export const listenChoose = (text: string, wrong: string[], explanation: string): ExerciseDraft => ({
  type: "listening",
  category: "listening",
  text,
  mode: "choose",
  options: [text, ...wrong],
  answers: [text],
  explanation,
});

export const dlg = (context: string, lines: [string, string][], answer: string, wrong: string[], explanation: string): ExerciseDraft => ({
  type: "dialogue",
  category: "conversation",
  context,
  lines: lines.map(([speaker, text]) => ({ speaker, text })),
  options: [answer, ...wrong],
  answer,
  explanation,
});

export const reading = (
  passage: string,
  passagePt: string,
  questions: [question: string, answer: string, wrong: string[], explanation: string][],
): ExerciseDraft[] =>
  questions.map(([question, answer, wrong, explanation]) => ({
    type: "reading" as const,
    category: "reading" as const,
    passage,
    passagePt,
    question,
    options: [answer, ...wrong],
    answer,
    explanation,
  }));

export interface LessonDef {
  id: string;
  unit: string;
  title: string;
  titlePt: string;
  cefr: Cefr;
  emoji: string;
  objective: string;
  objectivePt: string;
  vocab: VocabTuple[];
  exercises: (ExerciseDraft | ExerciseDraft[])[];
}

export function lesson(def: LessonDef): Lesson {
  const drafts = def.exercises.flat();
  const vocabulary: VocabEntry[] = def.vocab.map(([word, translation, example, exampleTranslation, context]) => ({
    word,
    translation,
    example,
    exampleTranslation,
    context,
  }));
  return {
    id: def.id,
    unit: def.unit,
    title: def.title,
    titlePt: def.titlePt,
    cefr: def.cefr,
    emoji: def.emoji,
    objective: def.objective,
    objectivePt: def.objectivePt,
    xp: 8 + drafts.length * 4,
    vocabulary,
    exercises: drafts.map((d, i) => ({ ...d, id: `${def.id}-${i + 1}` }) as Exercise),
  };
}
