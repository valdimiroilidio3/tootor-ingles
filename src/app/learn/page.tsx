"use client";

import { LearningPath } from "@/components/LearningPath";
import { useReadyApp } from "@/components/AppProvider";
import { LinkButton, PageHeader, Pill, ProgressBar } from "@/components/ui";
import { getLesson, LESSONS, nextLesson } from "@/content";
import { ArrowRight } from "lucide-react";
import { validateLessonSession } from "@/lib/lesson-session";

export default function LearnPage() {
  const { data, settings, lessonSessions } = useReadyApp();
  const done = LESSONS.filter((l) => data.progress[l.id]).length;
  const next = nextLesson(data.progress, settings);
  const resumeSession = lessonSessions
    .map((session) => ({ session, lesson: getLesson(session.lessonId) }))
    .filter(({ session, lesson }) => lesson && validateLessonSession(session, lesson).ok)
    .sort((a, b) => b.session.updatedAt.localeCompare(a.session.updatedAt))[0]?.session;
  return (
    <div>
      <PageHeader
        title="Learning path"
        subtitle="Complete lessons in order to unlock the next ones. Lessons before your placement point are already open."
        action={
          resumeSession ? (
            <LinkButton href={`/lesson/${resumeSession.lessonId}`}>
              {resumeSession.status === "failed" ? "Review saved attempt" : "Resume lesson"} <ArrowRight className="size-4" aria-hidden />
            </LinkButton>
          ) : next ? (
            <LinkButton href={`/lesson/${next.id}`}>
              Continue <ArrowRight className="size-4" aria-hidden />
            </LinkButton>
          ) : undefined
        }
      />
      <div className="mb-8 flex items-center gap-4 rounded-3xl border border-line bg-white p-4 shadow-soft">
        <div className="flex-1">
          <div className="mb-2 flex items-center justify-between text-sm font-bold">
            <span>Course progress</span>
            <Pill>
              {done}/{LESSONS.length} lessons
            </Pill>
          </div>
          <ProgressBar value={(done / LESSONS.length) * 100} label="Course progress" />
        </div>
      </div>
      <LearningPath />
    </div>
  );
}
