"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { evaluateBadges, type Badge } from "@/lib/achievements";
import { createBackup } from "@/lib/backup";
import * as idb from "@/lib/idb";
import { scoreLesson } from "@/lib/scoring";
import { createVocabItem, reviewItem, type Grade } from "@/lib/srs";
import { EMPTY_DATA, type ActivityEntry, type AppData, type Attempt, type Backup, type Category, type Conversation, type ExerciseType, type LessonProgress, type Settings, type VocabEntry, type VocabItem } from "@/lib/types";
import { dateKey, uid } from "@/lib/util";
import { lessonXp } from "@/lib/xp";

export interface LessonResultInput {
  exerciseId: string;
  category: Category;
  type: ExerciseType;
  correct: boolean;
  answer: string;
  expected: string;
  prompt: string;
}

export interface FinishLessonInput {
  lessonId: string;
  kind: "lesson" | "daily";
  baseXp: number;
  passed: boolean;
  results: LessonResultInput[];
  seconds: number;
  vocab: VocabEntry[];
}

export interface FinishLessonResult {
  xpAwarded: number;
  firstCompletion: boolean;
  accuracy: number;
  stars: 1 | 2 | 3;
  newBadges: Badge[];
  wordsAdded: number;
}

interface AppContextValue {
  status: "loading" | "ready";
  data: AppData;
  storageError: string | null;
  dismissStorageError: () => void;
  saveSettings: (patch: Partial<Settings>) => Promise<void>;
  finishLesson: (input: FinishLessonInput) => Promise<FinishLessonResult>;
  addVocab: (entry: Partial<VocabEntry> & Pick<VocabEntry, "word" | "translation">, source?: VocabItem["source"]) => Promise<VocabItem | null>;
  removeVocab: (id: string) => Promise<void>;
  reviewVocab: (id: string, grade: Grade) => Promise<void>;
  recordActivity: (entry: Omit<ActivityEntry, "id" | "date" | "at"> & { dedupeKey?: string }) => Promise<boolean>;
  saveConversation: (c: Conversation) => Promise<void>;
  exportBackup: () => Backup;
  importBackup: (data: AppData) => Promise<void>;
  resetProgress: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [storageError, setStorageError] = useState<string | null>(null);
  const ref = useRef<AppData>(EMPTY_DATA);

  const commit = useCallback((next: AppData) => {
    ref.current = next;
    setData(next);
  }, []);

  const safe = useCallback(async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      setStorageError(
        `Your changes could not be saved to this browser's storage (${e instanceof Error ? e.message : "unknown error"}). They are kept in memory until you close the tab — export a backup from Settings if possible.`,
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let loaded: AppData = EMPTY_DATA;
      try {
        const [settings, progress, attempts, vocab, activity, conversations] = await Promise.all([
          idb.getAll<Settings>("settings"),
          idb.getAll<LessonProgress>("progress"),
          idb.getAll<Attempt>("attempts"),
          idb.getAll<VocabItem>("vocab"),
          idb.getAll<ActivityEntry>("activity"),
          idb.getAll<Conversation>("conversations"),
        ]);
        loaded = {
          settings: settings[0] ?? null,
          progress: Object.fromEntries(progress.map((p) => [p.lessonId, p])),
          attempts,
          vocab,
          activity,
          conversations,
        };
      } catch (e) {
        if (!cancelled) {
          setStorageError(
            `Local storage is unavailable (${e instanceof Error ? e.message : "unknown error"}). The app works, but progress will not be saved after you close this tab.`,
          );
        }
      }
      if (cancelled) return;
      ref.current = loaded;
      setData(loaded);
      setStatus("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const now = new Date().toISOString();
      const base: Settings = ref.current.settings ?? {
        id: "main",
        onboarded: false,
        nativeLanguage: "pt",
        targetLanguage: "en",
        level: "beginner",
        goal: "everyday",
        dailyMinutes: 10,
        startingLessonId: "a1-greetings",
        tutorPersonality: "friendly",
        tutorDifficulty: "beginner",
        tutorMode: "offline",
        speechRate: 0.9,
        voiceURI: null,
        createdAt: now,
      };
      const settings: Settings = { ...base, ...patch, id: "main" };
      commit({ ...ref.current, settings });
      await safe(() => idb.put("settings", settings));
    },
    [commit, safe],
  );

  const addVocab = useCallback<AppContextValue["addVocab"]>(
    async (entry, source = "manual") => {
      const exists = ref.current.vocab.some((v) => v.word.trim().toLowerCase() === entry.word.trim().toLowerCase());
      if (exists) return null;
      const item = createVocabItem(entry, source);
      commit({ ...ref.current, vocab: [...ref.current.vocab, item] });
      await safe(() => idb.put("vocab", item));
      return item;
    },
    [commit, safe],
  );

  const removeVocab = useCallback(
    async (id: string) => {
      commit({ ...ref.current, vocab: ref.current.vocab.filter((v) => v.id !== id) });
      await safe(() => idb.remove("vocab", id));
    },
    [commit, safe],
  );

  const reviewVocab = useCallback(
    async (id: string, grade: Grade) => {
      const item = ref.current.vocab.find((v) => v.id === id);
      if (!item) return;
      const updated = reviewItem(item, grade);
      commit({ ...ref.current, vocab: ref.current.vocab.map((v) => (v.id === id ? updated : v)) });
      await safe(() => idb.put("vocab", updated));
    },
    [commit, safe],
  );

  const recordActivity = useCallback<AppContextValue["recordActivity"]>(
    async ({ dedupeKey, ...entry }) => {
      const date = dateKey();
      const id = dedupeKey ? `${dedupeKey}-${date}` : uid();
      if (dedupeKey && ref.current.activity.some((a) => a.id === id)) return false;
      const full: ActivityEntry = { ...entry, id, date, at: new Date().toISOString() };
      commit({ ...ref.current, activity: [...ref.current.activity, full] });
      await safe(() => idb.put("activity", full));
      return true;
    },
    [commit, safe],
  );

  const saveConversation = useCallback(
    async (c: Conversation) => {
      const others = ref.current.conversations.filter((x) => x.id !== c.id);
      commit({ ...ref.current, conversations: [...others, c] });
      await safe(() => idb.put("conversations", c));
    },
    [commit, safe],
  );

  const finishLesson = useCallback<AppContextValue["finishLesson"]>(
    async (input) => {
      const before = ref.current;
      const badgesBefore = new Set(evaluateBadges(before).filter((b) => b.unlocked).map((b) => b.id));
      const now = new Date();
      const score = scoreLesson(input.results);
      const existing = before.progress[input.lessonId];
      const first = input.passed && !existing;
      const xp = first ? lessonXp(input.baseXp, score.accuracy) : 0;

      const attempts: Attempt[] = input.results.map((r) => ({
        id: uid(),
        lessonId: input.lessonId,
        exerciseId: r.exerciseId,
        category: r.category,
        type: r.type,
        correct: r.correct,
        answer: r.answer,
        expected: r.expected,
        prompt: r.prompt,
        at: now.toISOString(),
      }));

      const activity: ActivityEntry = {
        id: uid(),
        date: dateKey(now),
        at: now.toISOString(),
        xp,
        seconds: Math.max(0, Math.round(input.seconds)),
        kind: input.kind,
        refId: input.lessonId,
      };

      let progress = before.progress;
      let progressRecord: LessonProgress | null = null;
      if (input.passed) {
        progressRecord = {
          lessonId: input.lessonId,
          completedAt: existing?.completedAt ?? now.toISOString(),
          bestAccuracy: Math.max(existing?.bestAccuracy ?? 0, score.accuracy),
          bestStars: Math.max(existing?.bestStars ?? 1, score.stars) as 1 | 2 | 3,
          timesCompleted: (existing?.timesCompleted ?? 0) + 1,
          xpAwarded: (existing?.xpAwarded ?? 0) + xp,
        };
        progress = { ...progress, [input.lessonId]: progressRecord };
      }

      const known = new Set(before.vocab.map((v) => v.word.trim().toLowerCase()));
      const newVocab = input.passed
        ? input.vocab.filter((v) => !known.has(v.word.trim().toLowerCase())).map((v) => createVocabItem(v, "lesson", now))
        : [];

      const next: AppData = {
        ...before,
        progress,
        attempts: [...before.attempts, ...attempts],
        activity: [...before.activity, activity],
        vocab: [...before.vocab, ...newVocab],
      };
      commit(next);
      await safe(async () => {
        await idb.putMany("attempts", attempts);
        await idb.put("activity", activity);
        if (progressRecord) await idb.put("progress", progressRecord);
        await idb.putMany("vocab", newVocab);
      });

      const newBadges = evaluateBadges(next).filter((b) => b.unlocked && !badgesBefore.has(b.id));
      return { xpAwarded: xp, firstCompletion: first, accuracy: score.accuracy, stars: score.stars, newBadges, wordsAdded: newVocab.length };
    },
    [commit, safe],
  );

  const exportBackup = useCallback(() => createBackup(ref.current), []);

  const importBackup = useCallback(
    async (incoming: AppData) => {
      commit(incoming);
      await safe(() =>
        idb.replaceAll({
          settings: incoming.settings ? [incoming.settings] : [],
          progress: Object.values(incoming.progress),
          attempts: incoming.attempts,
          vocab: incoming.vocab,
          activity: incoming.activity,
          conversations: incoming.conversations,
        }),
      );
    },
    [commit, safe],
  );

  const resetProgress = useCallback(async () => {
    commit({ ...EMPTY_DATA, settings: ref.current.settings });
    await safe(() => idb.clearAll(["progress", "attempts", "vocab", "activity", "conversations"]));
  }, [commit, safe]);

  const value = useMemo<AppContextValue>(
    () => ({
      status,
      data,
      storageError,
      dismissStorageError: () => setStorageError(null),
      saveSettings,
      finishLesson,
      addVocab,
      removeVocab,
      reviewVocab,
      recordActivity,
      saveConversation,
      exportBackup,
      importBackup,
      resetProgress,
    }),
    [status, data, storageError, saveSettings, finishLesson, addVocab, removeVocab, reviewVocab, recordActivity, saveConversation, exportBackup, importBackup, resetProgress],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

/** For pages rendered inside the Shell, where settings are guaranteed to exist. */
export function useReadyApp(): Omit<AppContextValue, "data"> & { data: AppData; settings: Settings } {
  const app = useApp();
  if (!app.data.settings) throw new Error("Settings are not ready");
  return { ...app, settings: app.data.settings };
}
