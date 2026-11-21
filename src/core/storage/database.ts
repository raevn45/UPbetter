import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Alarm, Countdown, SavedCity, TimerRecord } from "../domain/types";

interface UpDatabase extends DBSchema {
  alarms: { key: string; value: Alarm };
  countdowns: { key: string; value: Countdown };
  cities: { key: string; value: SavedCity };
  timers: { key: string; value: TimerRecord };
  settings: { key: string; value: unknown };
}

let dbPromise: Promise<IDBPDatabase<UpDatabase>> | undefined;

export function getDatabase() {
  if (!globalThis.indexedDB) throw new Error("Local database is unavailable in this environment.");
  dbPromise ??= openDB<UpDatabase>("up-local", 1, {
    upgrade(db) {
      db.createObjectStore("alarms", { keyPath: "id" });
      db.createObjectStore("countdowns", { keyPath: "id" });
      db.createObjectStore("cities", { keyPath: "id" });
      db.createObjectStore("timers", { keyPath: "id" });
      db.createObjectStore("settings");
    }
  });
  return dbPromise;
}

export const localStore = {
  async all<T extends "alarms" | "countdowns" | "cities" | "timers">(store: T) {
    const db = await getDatabase();
    return db.getAll(store);
  },
  async get<T extends "alarms" | "countdowns" | "cities" | "timers">(store: T, id: string) {
    const db = await getDatabase();
    return db.get(store, id);
  },
  async put<T extends "alarms" | "countdowns" | "cities" | "timers">(store: T, value: T extends "alarms" ? Alarm : T extends "countdowns" ? Countdown : T extends "cities" ? SavedCity : TimerRecord) {
    const db = await getDatabase();
    await db.put(store, value as never);
  },
  async delete<T extends "alarms" | "countdowns" | "cities" | "timers">(store: T, id: string) {
    const db = await getDatabase();
    await db.delete(store, id);
  }
};
