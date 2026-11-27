import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { getAll, replaceAll, writeBatch } from "../idb";

const activity = { id: "seed-activity", date: "2026-11-26", at: "2026-11-26T12:00:00.000Z", xp: 0, seconds: 30, kind: "lesson" as const };
const progress = { lessonId: "seed-lesson", completedAt: "2026-11-26T12:00:00.000Z", bestAccuracy: 1, bestStars: 3 as const, timesCompleted: 1, xpAwarded: 10 };

describe("IndexedDB atomic writes", () => {
  it("upgrades v1 additively and preserves existing learning records", async () => {
    const legacy = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("lumo-english", 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const [name, keyPath] of [["settings", "id"], ["progress", "lessonId"], ["attempts", "id"], ["vocab", "id"], ["activity", "id"], ["conversations", "id"]]) {
          db.createObjectStore(name, { keyPath });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = legacy.transaction(["activity", "progress"], "readwrite");
    tx.objectStore("activity").put(activity);
    tx.objectStore("progress").put(progress);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    legacy.close();

    expect(await getAll("activity")).toEqual([activity]);
    expect(await getAll("progress")).toEqual([progress]);
    expect(await getAll("sessions")).toEqual([]);
  });

  it("keeps records and the checkpoint intact when a completion transaction rolls back", async () => {
    const session = { lessonId: "seed-lesson", version: 1, status: "in-progress", exerciseIndex: 0, results: [], heartsLeft: 5, draft: null, elapsedSeconds: 3, updatedAt: "2026-11-26T12:00:00.000Z" };
    await replaceAll({ activity: [activity], progress: [progress], sessions: [session] });

    await expect(
      writeBatch({
        activity: [{ ...activity, id: "partial-activity" }],
        progress: [{ ...progress, lessonId: undefined }],
      }, { sessions: ["seed-lesson"] }),
    ).rejects.toBeTruthy();

    expect(await getAll("activity")).toEqual([activity]);
    expect(await getAll("progress")).toEqual([progress]);
    expect(await getAll("sessions")).toEqual([session]);
  });
});
