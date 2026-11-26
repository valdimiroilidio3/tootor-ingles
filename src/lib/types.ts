export type Level = "beginner" | "elementary" | "intermediate" | "advanced";
export type Goal = "everyday" | "work" | "travel" | "study" | "fluency";
export type Cefr = "A1" | "A2" | "B1";
export type Category = "vocabulary" | "grammar" | "listening" | "reading" | "conversation";
export type DailyMinutes = 5 | 10 | 15 | 20;
export type TutorMode = "offline" | "ollama" | "external";
export type Difficulty = "beginner" | "intermediate" | "advanced";
export type PersonalityId = "friendly" | "coach" | "casual";

/* ---------- Curriculum ---------- */

export interface VocabEntry {
  word: string;
  translation: string;
  example: string;
  exampleTranslation: string;
  context: string;
}

interface BaseExercise {
  id: string;
  category: Category;
  /** Explanation shown after answering (Portuguese). */
  explanation: string;
}

export interface MultipleChoiceExercise extends BaseExercise {
  type: "multiple-choice";
  prompt: string;
  options: string[];
  answer: string;
}
export interface TranslationExercise extends BaseExercise {
  type: "translation";
  prompt: string;
  direction: "pt-en" | "en-pt";
  answers: string[];
}
export interface WordOrderExercise extends BaseExercise {
  type: "word-order" | "sentence-construction";
  promptPt: string;
  answer: string;
  alternatives: string[];
  distractors: string[];
}
export interface MatchingExercise extends BaseExercise {
  type: "matching";
  pairs: { en: string; pt: string }[];
}
export interface FillBlankExercise extends BaseExercise {
  type: "fill-blank";
  sentence: string;
  translation: string;
  options: string[];
  answer: string;
}
export interface ListeningExercise extends BaseExercise {
  type: "listening";
  text: string;
  mode: "choose" | "type";
  options: string[];
  answers: string[];
}
export interface DialogueExercise extends BaseExercise {
  type: "dialogue";
  context: string;
  lines: { speaker: string; text: string }[];
  options: string[];
  answer: string;
}
export interface ReadingExercise extends BaseExercise {
  type: "reading";
  passage: string;
  passagePt: string;
  question: string;
  options: string[];
  answer: string;
}

export type Exercise =
  | MultipleChoiceExercise
  | TranslationExercise
  | WordOrderExercise
  | MatchingExercise
  | FillBlankExercise
  | ListeningExercise
  | DialogueExercise
  | ReadingExercise;

export type ExerciseType = Exercise["type"];

export interface Lesson {
  id: string;
  unit: string;
  title: string;
  titlePt: string;
  cefr: Cefr;
  emoji: string;
  objective: string;
  objectivePt: string;
  xp: number;
  vocabulary: VocabEntry[];
  exercises: Exercise[];
}

/** A learner response: text, ordered tokens, or matched pairs ("en::pt"). */
export type Response = string | string[];

/* ---------- Persistent data ---------- */

export interface Settings {
  id: "main";
  onboarded: boolean;
  nativeLanguage: "pt";
  targetLanguage: "en";
  level: Level;
  goal: Goal;
  dailyMinutes: DailyMinutes;
  startingLessonId: string;
  diagnostic?: { correct: number; total: number; date: string };
  tutorPersonality: PersonalityId;
  tutorDifficulty: Difficulty;
  tutorMode: TutorMode;
  speechRate: number;
  voiceURI: string | null;
  createdAt: string;
}

export interface LessonProgress {
  lessonId: string;
  completedAt: string;
  bestAccuracy: number;
  bestStars: 1 | 2 | 3;
  timesCompleted: number;
  xpAwarded: number;
}

export interface Attempt {
  id: string;
  lessonId: string;
  exerciseId: string;
  category: Category;
  type: ExerciseType;
  correct: boolean;
  answer: string;
  expected: string;
  prompt: string;
  at: string;
}

export interface VocabItem {
  id: string;
  word: string;
  translation: string;
  example: string;
  exampleTranslation: string;
  context: string;
  familiarity: number;
  lastReviewed: string | null;
  nextReview: string;
  correct: number;
  incorrect: number;
  source: "lesson" | "manual" | "tutor";
  createdAt: string;
}

export interface ActivityEntry {
  id: string;
  /** Local date key YYYY-MM-DD. */
  date: string;
  at: string;
  xp: number;
  seconds: number;
  kind: "lesson" | "daily" | "review" | "tutor";
  refId?: string;
}

export interface Correction {
  original: string;
  corrected: string;
  explanationPt: string;
}

export interface TutorFeedback {
  corrections: Correction[];
  natural?: string;
  alternatives: string[];
  tipPt?: string;
  onTopic: boolean;
  praise?: string;
}

export interface TutorMessage {
  id: string;
  role: "tutor" | "user";
  text: string;
  textPt?: string;
  feedback?: TutorFeedback;
  suggestions?: string[];
  at: string;
}

export interface SessionSummary {
  turns: number;
  correctionCount: number;
  onTopicCount: number;
  highlights: Correction[];
  phrases: string[];
  text: string;
}

export interface Conversation {
  id: string;
  scenarioId: string;
  personality: PersonalityId;
  difficulty: Difficulty;
  mode: TutorMode;
  startedAt: string;
  endedAt?: string;
  messages: TutorMessage[];
  summary?: SessionSummary;
  fellBackToOffline?: boolean;
}

export interface AppData {
  settings: Settings | null;
  progress: Record<string, LessonProgress>;
  attempts: Attempt[];
  vocab: VocabItem[];
  activity: ActivityEntry[];
  conversations: Conversation[];
}

export interface Backup {
  app: "lumo-english";
  version: 1;
  exportedAt: string;
  data: {
    settings: Settings | null;
    progress: LessonProgress[];
    attempts: Attempt[];
    vocab: VocabItem[];
    activity: ActivityEntry[];
    conversations: Conversation[];
  };
}

export const EMPTY_DATA: AppData = {
  settings: null,
  progress: {},
  attempts: [],
  vocab: [],
  activity: [],
  conversations: [],
};
