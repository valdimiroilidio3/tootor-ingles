/** Minimal promise-based IndexedDB wrapper. All learning data stays on this device. */

const DB_NAME = "lumo-english";
const DB_VERSION = 1;

export const STORES = ["settings", "progress", "attempts", "vocab", "activity", "conversations"] as const;
export type StoreName = (typeof STORES)[number];

const KEY_PATH: Record<StoreName, string> = {
  settings: "id",
  progress: "lessonId",
  attempts: "id",
  vocab: "id",
  activity: "id",
  conversations: "id",
};

let dbPromise: Promise<IDBDatabase> | null = null;

export function idbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  if (!idbAvailable()) return Promise.reject(new Error("IndexedDB is not available in this browser."));
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const s of STORES) {
          if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: KEY_PATH[s] });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("Could not open the local database."));
      req.onblocked = () => reject(new Error("The local database is blocked by another tab."));
    }).catch((e) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise as Promise<IDBDatabase>;
}

function run<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(tx.error ?? new Error("Database transaction failed."));
        tx.onabort = () => reject(tx.error ?? new Error("Database transaction aborted."));
      }),
  );
}

export function getAll<T>(store: StoreName): Promise<T[]> {
  return run<T[]>(store, "readonly", (s) => s.getAll() as IDBRequest<T[]>);
}

export function put<T>(store: StoreName, value: T): Promise<unknown> {
  return run(store, "readwrite", (s) => s.put(value));
}

export function remove(store: StoreName, key: string): Promise<unknown> {
  return run(store, "readwrite", (s) => s.delete(key));
}

export function clear(store: StoreName): Promise<unknown> {
  return run(store, "readwrite", (s) => s.clear());
}

export async function putMany<T>(store: StoreName, values: T[]): Promise<void> {
  if (values.length === 0) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const os = tx.objectStore(store);
    for (const v of values) os.put(v);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Database transaction failed."));
    tx.onabort = () => reject(tx.error ?? new Error("Database transaction aborted."));
  });
}

function runTransaction(stores: readonly StoreName[], enqueue: (tx: IDBTransaction) => void): Promise<void> {
  if (stores.length === 0) return Promise.resolve();
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction([...stores], "readwrite");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("Database transaction failed."));
        tx.onabort = () => reject(tx.error ?? new Error("Database transaction aborted."));
        try {
          enqueue(tx);
        } catch (error) {
          try {
            tx.abort();
          } catch {
            // The transaction may already have aborted.
          }
          reject(error instanceof Error ? error : new Error("Could not queue database writes."));
        }
      }),
  );
}

export async function clearAll(stores: readonly StoreName[] = STORES): Promise<void> {
  await runTransaction(stores, (tx) => {
    for (const store of stores) tx.objectStore(store).clear();
  });
}

/** Writes related records in one transaction so a lesson completion cannot be partially saved. */
export async function writeBatch(records: Partial<Record<StoreName, unknown[]>>): Promise<void> {
  const stores = STORES.filter((store) => records[store] !== undefined);
  await runTransaction(stores, (tx) => {
    for (const store of stores) {
      const objectStore = tx.objectStore(store);
      for (const record of records[store] ?? []) objectStore.put(record);
    }
  });
}

/** Atomically replaces learning data: a failed import leaves the previous data intact. */
export async function replaceAll(records: Partial<Record<StoreName, unknown[]>>): Promise<void> {
  await runTransaction(STORES, (tx) => {
    for (const store of STORES) {
      const objectStore = tx.objectStore(store);
      objectStore.clear();
      for (const record of records[store] ?? []) objectStore.put(record);
    }
  });
}
