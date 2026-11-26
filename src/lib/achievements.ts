import { LESSONS } from "@/content";
import type { AppData } from "./types";
import { computeStreak, totalXp } from "./stats";
import { isLearned } from "./srs";
import { dateKey } from "./util";

export interface Badge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  unlocked: boolean;
}

export function evaluateBadges(data: AppData, today: string = dateKey()): Badge[] {
  const completed = Object.keys(data.progress).filter((id) => !id.startsWith("daily-"));
  const xp = totalXp(data.activity);
  const streak = computeStreak(data.activity.map((a) => a.date), today).longest;
  const learned = data.vocab.filter(isLearned).length;
  const perfect = Object.values(data.progress).some((p) => p.bestAccuracy === 1);
  const a1 = LESSONS.filter((l) => l.cefr === "A1");
  const reviews = data.vocab.reduce((s, v) => s + v.correct + v.incorrect, 0);
  const b = (id: string, title: string, description: string, emoji: string, unlocked: boolean): Badge => ({ id, title, description, emoji, unlocked });
  return [
    b("first-lesson", "First steps", "Complete your first lesson.", "🌱", completed.length >= 1),
    b("five-lessons", "On a roll", "Complete 5 lessons.", "🚀", completed.length >= 5),
    b("ten-lessons", "Dedicated", "Complete 10 lessons.", "🏅", completed.length >= 10),
    b("perfect", "Flawless", "Finish a lesson with 100% accuracy.", "💎", perfect),
    b("streak-3", "3-day streak", "Study on 3 days in a row.", "🔥", streak >= 3),
    b("streak-7", "7-day streak", "Reach a 7-day streak.", "⚡", streak >= 7),
    b("xp-100", "100 XP", "Earn 100 XP in total.", "✨", xp >= 100),
    b("xp-500", "500 XP", "Earn 500 XP in total.", "🌟", xp >= 500),
    b("words-10", "Word collector", "Learn 10 words (familiarity 3+).", "📚", learned >= 10),
    b("reviews-25", "Memory builder", "Answer 25 flashcards.", "🧠", reviews >= 25),
    b("talker", "First conversation", "Finish a tutor role-play.", "💬", data.conversations.some((c) => c.endedAt && c.messages.some((m) => m.role === "user"))),
    b("a1-complete", "A1 graduate", "Complete every A1 lesson.", "🎓", a1.every((l) => data.progress[l.id])),
  ];
}
