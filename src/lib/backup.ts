import type { ActivityEntry, AppData, Attempt, Backup, Conversation, LessonProgress, Settings, VocabItem } from "./types";

type Rec = Record<string, unknown>;
const isObj = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isBool = (v: unknown): v is boolean => typeof v === "boolean";

const LEVELS = ["beginner", "elementary", "intermediate", "advanced"];
const GOALS = ["everyday", "work", "travel", "study", "fluency"];
const MODES = ["offline", "ollama", "external"];
const CATEGORIES = ["vocabulary", "grammar", "listening", "reading", "conversation"];

function isSettings(v: unknown): v is Settings {
  return (
    isObj(v) &&
    v.id === "main" &&
    isBool(v.onboarded) &&
    isStr(v.level) &&
    LEVELS.includes(v.level) &&
    isStr(v.goal) &&
    GOALS.includes(v.goal) &&
    isNum(v.dailyMinutes) &&
    [5, 10, 15, 20].includes(v.dailyMinutes) &&
    isStr(v.startingLessonId) &&
    isStr(v.tutorMode) &&
    MODES.includes(v.tutorMode) &&
    isNum(v.speechRate) &&
    isStr(v.createdAt)
  );
}
const isProgress = (v: unknown): v is LessonProgress =>
  isObj(v) && isStr(v.lessonId) && isStr(v.completedAt) && isNum(v.bestAccuracy) && v.bestAccuracy >= 0 && v.bestAccuracy <= 1 && isNum(v.timesCompleted) && v.timesCompleted >= 1 && isNum(v.xpAwarded) && v.xpAwarded >= 0 && [1, 2, 3].includes(v.bestStars as number);
const isAttempt = (v: unknown): v is Attempt =>
  isObj(v) && isStr(v.id) && isStr(v.lessonId) && isStr(v.exerciseId) && isStr(v.category) && CATEGORIES.includes(v.category) && isBool(v.correct) && isStr(v.at) && isStr(v.prompt) && isStr(v.expected) && isStr(v.answer);
const isVocab = (v: unknown): v is VocabItem =>
  isObj(v) && isStr(v.id) && isStr(v.word) && Boolean(v.word.trim()) && isStr(v.translation) && isNum(v.familiarity) && Number.isInteger(v.familiarity) && v.familiarity >= 0 && v.familiarity <= 6 && isStr(v.nextReview) && Number.isFinite(Date.parse(v.nextReview)) && isNum(v.correct) && v.correct >= 0 && isNum(v.incorrect) && v.incorrect >= 0 && isStr(v.createdAt) && (v.lastReviewed === null || isStr(v.lastReviewed));
const isActivity = (v: unknown): v is ActivityEntry =>
  isObj(v) && isStr(v.id) && isStr(v.date) && /^\d{4}-\d{2}-\d{2}$/.test(v.date) && isStr(v.at) && isNum(v.xp) && v.xp >= 0 && isNum(v.seconds) && v.seconds >= 0 && isStr(v.kind) && ["lesson", "daily", "review", "tutor"].includes(v.kind);
const isConversation = (v: unknown): v is Conversation =>
  isObj(v) && isStr(v.id) && isStr(v.scenarioId) && isStr(v.startedAt) && Array.isArray(v.messages) && v.messages.every((m) => isObj(m) && isStr(m.id) && isStr(m.text) && (m.role === "user" || m.role === "tutor"));

function hasUniqueKeys<T>(items: T[], keyOf: (item: T) => string): boolean {
  const keys = new Set<string>();
  for (const item of items) {
    const key = keyOf(item);
    if (keys.has(key)) return false;
    keys.add(key);
  }
  return true;
}

export function createBackup(data: AppData, now: Date = new Date()): Backup {
  return {
    app: "lumo-english",
    version: 1,
    exportedAt: now.toISOString(),
    data: {
      settings: data.settings,
      progress: Object.values(data.progress),
      attempts: data.attempts,
      vocab: data.vocab,
      activity: data.activity,
      conversations: data.conversations,
    },
  };
}

export type ParseResult = { ok: true; data: AppData } | { ok: false; error: string };

function listOf<T>(v: unknown, guard: (x: unknown) => x is T, label: string): { items: T[] } | { error: string } {
  if (!Array.isArray(v)) return { error: `Backup is missing the "${label}" list.` };
  const bad = v.findIndex((x) => !guard(x));
  if (bad !== -1) return { error: `Invalid entry #${bad + 1} in "${label}".` };
  return { items: v as T[] };
}

/** Validates an imported backup completely before anything is written. */
export function parseBackup(raw: unknown): ParseResult {
  if (!isObj(raw)) return { ok: false, error: "This file is not a valid backup." };
  if (raw.app !== "lumo-english") return { ok: false, error: "This file was not created by Lumo English." };
  if (raw.version !== 1) return { ok: false, error: "Unsupported backup version." };
  if (!isObj(raw.data)) return { ok: false, error: "Backup data is missing." };
  const d = raw.data;
  if (d.settings !== null && !isSettings(d.settings)) return { ok: false, error: "Backup settings are invalid." };

  const progress = listOf(d.progress, isProgress, "progress");
  if ("error" in progress) return { ok: false, error: progress.error };
  const attempts = listOf(d.attempts, isAttempt, "attempts");
  if ("error" in attempts) return { ok: false, error: attempts.error };
  const vocab = listOf(d.vocab, isVocab, "vocab");
  if ("error" in vocab) return { ok: false, error: vocab.error };
  const activity = listOf(d.activity, isActivity, "activity");
  if ("error" in activity) return { ok: false, error: activity.error };
  const conversations = listOf(d.conversations, isConversation, "conversations");
  if ("error" in conversations) return { ok: false, error: conversations.error };

  if (!hasUniqueKeys(progress.items, (item) => item.lessonId)) return { ok: false, error: "Duplicate lesson progress entries are not allowed." };
  if (!hasUniqueKeys(attempts.items, (item) => item.id)) return { ok: false, error: "Duplicate attempt IDs are not allowed." };
  if (!hasUniqueKeys(vocab.items, (item) => item.id)) return { ok: false, error: "Duplicate vocabulary IDs are not allowed." };
  if (!hasUniqueKeys(activity.items, (item) => item.id)) return { ok: false, error: "Duplicate activity IDs are not allowed." };
  if (!hasUniqueKeys(conversations.items, (item) => item.id)) return { ok: false, error: "Duplicate conversation IDs are not allowed." };

  return {
    ok: true,
    data: {
      settings: d.settings as Settings | null,
      progress: Object.fromEntries(progress.items.map((p) => [p.lessonId, p])),
      attempts: attempts.items,
      vocab: vocab.items,
      activity: activity.items,
      conversations: conversations.items,
    },
  };
}
