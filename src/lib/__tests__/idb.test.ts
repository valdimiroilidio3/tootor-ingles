import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { getAll, replaceAll, writeBatch } from "../idb";

const activity = { id: "seed-activity", date: "2026-11-26", at: "2026-11-26T12:00:00.000Z", xp: 0, seconds: 30, kind: "lesson" as const };
const progress = { lessonId: "seed-lesson", completedAt: "2026-11-26T12:00:00.000Z", bestAccuracy: 1, bestStars: 3 as const, timesCompleted: 1, xpAwarded: 10 };

describe("IndexedDB atomic writes", () => {
  it("keeps existing records intact when a multi-store write fails", async () => {
    await replaceAll({ activity: [activity], progress: [progress] });

    await expect(
      writeBatch({
        activity: [{ ...activity, id: "partial-activity" }],
        progress: [{ ...progress, lessonId: undefined }],
      }),
    ).rejects.toBeTruthy();

    expect(await getAll("activity")).toEqual([activity]);
    expect(await getAll("progress")).toEqual([progress]);
  });
});
