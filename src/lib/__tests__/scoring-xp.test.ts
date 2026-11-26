import { describe, expect, it } from "vitest";
import { checkExercise, isTextCorrect, normalizeAnswer, scoreLesson } from "../scoring";
import { dailyXpGoal, lessonXp, levelFromXp, levelProgress, reviewXp, xpForLevel } from "../xp";
import { LESSONS } from "@/content";
import type { Exercise, WordOrderExercise } from "../types";

describe("answer normalisation", () => {
  it("ignores case, punctuation, accents and contractions", () => {
    expect(isTextCorrect("I'm   Fine!", ["I am fine"])).toBe(true);
    expect(isTextCorrect("Voce aceita cartão", ["você aceita cartao"])).toBe(true);
    expect(normalizeAnswer("It’s OK.")).toBe("it is ok");
  });
  it("rejects wrong or empty answers", () => {
    expect(isTextCorrect("", ["hello"])).toBe(false);
    expect(isTextCorrect("hello there", ["hello"])).toBe(false);
  });
});

describe("exercise checking", () => {
  const find = <T extends Exercise["type"]>(type: T) => LESSONS.flatMap((l) => l.exercises).find((e) => e.type === type) as Extract<Exercise, { type: T }>;

  it("checks multiple choice", () => {
    const ex = find("multiple-choice");
    expect(checkExercise(ex, ex.answer)).toBe(true);
    expect(checkExercise(ex, "definitely wrong")).toBe(false);
  });
  it("checks word order from tokens", () => {
    const ex = LESSONS.flatMap((l) => l.exercises).find((e): e is WordOrderExercise => e.type === "word-order")!;
    expect(checkExercise(ex, ex.answer.split(" "))).toBe(true);
    expect(checkExercise(ex, [...ex.answer.split(" ")].reverse())).toBe(false);
  });
  it("checks matching pairs", () => {
    const ex = find("matching");
    expect(checkExercise(ex, ex.pairs.map((p) => `${p.en}::${p.pt}`))).toBe(true);
    expect(checkExercise(ex, ex.pairs.map((p, i) => `${p.en}::${ex.pairs[(i + 1) % ex.pairs.length].pt}`))).toBe(false);
  });
  it("checks listening by typing", () => {
    const ex = LESSONS.flatMap((l) => l.exercises).find((e) => e.type === "listening" && e.mode === "type") as Extract<Exercise, { type: "listening" }>;
    expect(checkExercise(ex, ex.text.toUpperCase())).toBe(true);
  });
});

describe("lesson scoring", () => {
  it("computes accuracy and stars", () => {
    expect(scoreLesson([{ correct: true }, { correct: true }])).toMatchObject({ accuracy: 1, stars: 3 });
    expect(scoreLesson([{ correct: true }, { correct: false }])).toMatchObject({ accuracy: 0.5, stars: 1 });
    expect(scoreLesson([{ correct: true }, { correct: true }, { correct: true }, { correct: false }])).toMatchObject({ stars: 2 });
    expect(scoreLesson([])).toMatchObject({ accuracy: 0, total: 0 });
  });
});

describe("XP and levels", () => {
  it("awards between 60% and 100% of base XP and never less than 1", () => {
    expect(lessonXp(40, 1)).toBe(40);
    expect(lessonXp(40, 0)).toBe(24);
    expect(lessonXp(1, 0)).toBe(1);
    expect(lessonXp(40, 5)).toBe(40);
  });
  it("derives levels from XP", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(49)).toBe(1);
    expect(levelFromXp(50)).toBe(2);
    expect(levelFromXp(200)).toBe(3);
    expect(xpForLevel(3)).toBe(200);
    const p = levelProgress(125);
    expect(p.level).toBe(2);
    expect(p.current).toBe(75);
    expect(p.needed).toBe(150);
  });
  it("derives goals and review XP", () => {
    expect(dailyXpGoal(10)).toBe(40);
    expect(reviewXp(5)).toBe(5);
    expect(reviewXp(500)).toBe(20);
  });
});
