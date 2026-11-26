"use client";

import Link from "next/link";
import { Check, Lock, Play, Star } from "lucide-react";
import { useReadyApp } from "./AppProvider";
import { isUnlocked, LESSONS, nextLesson } from "@/content";
import type { Lesson } from "@/lib/types";
import { cn } from "@/lib/util";

const OFFSETS = [0, 28, 44, 28, 0];

function Node({ lesson, index, state, stars }: { lesson: Lesson; index: number; state: "completed" | "current" | "unlocked" | "locked"; stars?: number }) {
  const offset = OFFSETS[index % OFFSETS.length];
  const body = (
    <>
      <span
        className={cn(
          "relative grid size-16 shrink-0 place-items-center rounded-full border-b-[6px] text-2xl transition-transform",
          state === "completed" && "border-[#237a45] bg-success text-white",
          state === "current" && "border-brand-dark bg-brand ring-4 ring-brand/40",
          state === "unlocked" && "border-brand-dark bg-brand",
          state === "locked" && "border-line bg-ink/10 text-muted",
          state !== "locked" && "group-hover:-translate-y-0.5",
        )}
        aria-hidden
      >
        {state === "completed" ? <Check className="size-7" strokeWidth={3} /> : state === "locked" ? <Lock className="size-6" /> : state === "current" ? <Play className="size-6 fill-ink" /> : lesson.emoji}
      </span>
      <span className="min-w-0 text-left">
        <span className="block text-[11px] font-extrabold uppercase tracking-widest text-muted">
          {lesson.cefr} · Lesson {index + 1}
        </span>
        <span className="block truncate text-[17px] font-extrabold">{lesson.title}</span>
        <span className="block truncate text-sm text-muted">
          {state === "locked" ? "Complete the previous lesson to unlock" : state === "completed" ? <StarsLine n={stars ?? 1} /> : lesson.objectivePt}
        </span>
      </span>
    </>
  );
  const cls = "group flex w-full max-w-md items-center gap-4 rounded-3xl p-2 pr-4";
  return state === "locked" ? (
    <div className={cn(cls, "opacity-70")} style={{ marginLeft: offset }} aria-disabled="true">
      {body}
    </div>
  ) : (
    <Link href={`/lesson/${lesson.id}`} className={cn(cls, "hover:bg-white/70")} style={{ marginLeft: offset }}>
      {body}
    </Link>
  );
}

function StarsLine({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${n} of 3 stars`}>
      {[1, 2, 3].map((i) => (
        <Star key={i} className={cn("size-4", i <= n ? "fill-brand text-ink" : "text-line")} aria-hidden />
      ))}
      <span className="ml-1">Completed</span>
    </span>
  );
}

/** Full curriculum (grouped by unit) or a short preview around the current lesson. */
export function LearningPath({ preview }: { preview?: number }) {
  const { data, settings } = useReadyApp();
  const current = nextLesson(data.progress, settings);

  const stateOf = (i: number): "completed" | "current" | "unlocked" | "locked" => {
    const l = LESSONS[i];
    if (data.progress[l.id]) return "completed";
    if (!isUnlocked(i, data.progress, settings)) return "locked";
    return current?.id === l.id ? "current" : "unlocked";
  };

  let indexes = LESSONS.map((_, i) => i);
  if (preview) {
    const start = current ? LESSONS.findIndex((l) => l.id === current.id) : Math.max(0, LESSONS.length - preview);
    indexes = indexes.slice(start, start + preview);
  }

  const units: { unit: string; items: number[] }[] = [];
  for (const i of indexes) {
    const unit = LESSONS[i].unit;
    const last = units[units.length - 1];
    if (last && last.unit === unit) last.items.push(i);
    else units.push({ unit, items: [i] });
  }

  return (
    <div className="space-y-6">
      {units.map((u) => (
        <section key={u.unit} aria-label={u.unit}>
          {!preview && <h2 className="mb-2 rounded-2xl bg-ink px-4 py-2.5 text-sm font-extrabold uppercase tracking-widest text-white">{u.unit}</h2>}
          <div className="flex flex-col gap-1">
            {u.items.map((i) => (
              <Node key={LESSONS[i].id} lesson={LESSONS[i]} index={i} state={stateOf(i)} stars={data.progress[LESSONS[i].id]?.bestStars} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
