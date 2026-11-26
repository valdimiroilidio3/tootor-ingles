import type { Category, Exercise, Response } from "./types";

export const MAX_HEARTS = 5;

const CONTRACTIONS: Record<string, string> = {
  "i'm": "i am",
  "you're": "you are",
  "he's": "he is",
  "she's": "she is",
  "it's": "it is",
  "we're": "we are",
  "they're": "they are",
  "that's": "that is",
  "what's": "what is",
  "there's": "there is",
  "here's": "here is",
  "let's": "let us",
  "i'll": "i will",
  "you'll": "you will",
  "we'll": "we will",
  "i'd": "i would",
  "i've": "i have",
  "we've": "we have",
  "you've": "you have",
  "don't": "do not",
  "doesn't": "does not",
  "didn't": "did not",
  "isn't": "is not",
  "aren't": "are not",
  "wasn't": "was not",
  "weren't": "were not",
  "haven't": "have not",
  "hasn't": "has not",
  "won't": "will not",
  "can't": "cannot",
  "couldn't": "could not",
  "wouldn't": "would not",
};

/**
 * Normalises free-text answers so trivial differences (case, accents,
 * punctuation, contractions, spacing) are not treated as mistakes.
 */
export function normalizeAnswer(input: string): string {
  let s = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[.,!?;:"“”()¿¡]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  s = s
    .split(" ")
    .map((w) => CONTRACTIONS[w] ?? w)
    .join(" ")
    .replace(/\bcan not\b/g, "cannot");
  return s;
}

export function isTextCorrect(input: string, accepted: string[]): boolean {
  const n = normalizeAnswer(input);
  if (!n) return false;
  return accepted.some((a) => normalizeAnswer(a) === n);
}

export function checkExercise(ex: Exercise, response: Response): boolean {
  switch (ex.type) {
    case "multiple-choice":
    case "fill-blank":
    case "dialogue":
    case "reading":
      return typeof response === "string" && response === ex.answer;
    case "translation":
      return typeof response === "string" && isTextCorrect(response, ex.answers);
    case "word-order":
    case "sentence-construction": {
      const text = Array.isArray(response) ? response.join(" ") : response;
      return isTextCorrect(text, [ex.answer, ...ex.alternatives]);
    }
    case "listening":
      if (ex.mode === "choose") return typeof response === "string" && response === ex.text;
      return typeof response === "string" && isTextCorrect(response, ex.answers);
    case "matching": {
      if (!Array.isArray(response) || response.length !== ex.pairs.length) return false;
      const expected = new Set(ex.pairs.map((p) => `${p.en}::${p.pt}`));
      return response.every((r) => expected.has(r));
    }
  }
}

export function exercisePrompt(ex: Exercise): string {
  switch (ex.type) {
    case "multiple-choice":
      return ex.prompt;
    case "translation":
      return ex.prompt;
    case "word-order":
    case "sentence-construction":
      return ex.promptPt;
    case "matching":
      return "Match the pairs";
    case "fill-blank":
      return ex.sentence;
    case "listening":
      return ex.mode === "type" ? "Type what you hear" : "Choose what you hear";
    case "dialogue":
      return ex.lines.map((l) => `${l.speaker}: ${l.text}`).join(" / ");
    case "reading":
      return ex.question;
  }
}

export function expectedAnswer(ex: Exercise): string {
  switch (ex.type) {
    case "multiple-choice":
    case "fill-blank":
    case "dialogue":
    case "reading":
      return ex.answer;
    case "translation":
      return ex.answers[0];
    case "word-order":
    case "sentence-construction":
      return ex.answer;
    case "matching":
      return ex.pairs.map((p) => `${p.en} = ${p.pt}`).join("; ");
    case "listening":
      return ex.text;
  }
}

export function responseToText(response: Response): string {
  return Array.isArray(response) ? response.join(" ") : response;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  vocabulary: "Vocabulary",
  grammar: "Grammar",
  listening: "Listening",
  reading: "Reading",
  conversation: "Conversation",
};

export interface LessonScore {
  total: number;
  correct: number;
  accuracy: number;
  stars: 1 | 2 | 3;
}

export function scoreLesson(results: { correct: boolean }[]): LessonScore {
  const total = results.length;
  const correct = results.filter((r) => r.correct).length;
  const accuracy = total === 0 ? 0 : correct / total;
  const stars = accuracy >= 0.9 ? 3 : accuracy >= 0.7 ? 2 : 1;
  return { total, correct, accuracy, stars };
}
