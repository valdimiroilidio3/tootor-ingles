"use client";

import { useMemo } from "react";
import { useApp } from "@/components/AppProvider";
import { nextLesson } from "@/content";
import { countDue } from "./srs";
import { computeStreak, lastDays, secondsOn, totalXp, xpOn } from "./stats";
import { dateKey } from "./util";
import { dailyXpGoal, levelProgress } from "./xp";

/** Every metric shown on the dashboard is derived from saved activity here. */
export function useDerived() {
  const { data } = useApp();
  return useMemo(() => {
    const settings = data.settings;
    if (!settings) return null;
    const today = dateKey();
    const xp = totalXp(data.activity);
    const goal = dailyXpGoal(settings.dailyMinutes);
    const xpToday = xpOn(data.activity, today);
    return {
      today,
      xp,
      level: levelProgress(xp),
      goal,
      xpToday,
      secondsToday: secondsOn(data.activity, today),
      goalMet: xpToday >= goal,
      streak: computeStreak(
        data.activity.map((a) => a.date),
        today,
      ),
      week: lastDays(data.activity, today, 7),
      due: countDue(data.vocab),
      next: nextLesson(data.progress, settings),
      completedLessons: Object.keys(data.progress).filter((id) => !id.startsWith("daily-")).length,
    };
  }, [data]);
}
