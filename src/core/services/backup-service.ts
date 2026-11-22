import type { Alarm, Countdown, SavedCity, TimerRecord, Result } from "../domain/types";
import { failure, success } from "../domain/types";
import { getDatabase } from "../storage/database";

type BackupPayload = {
  app: "UP";
  schemaVersion: 1;
  exportedAt: string;
  alarms: Alarm[];
  countdowns: Countdown[];
  cities: SavedCity[];
  timers: TimerRecord[];
  settings: Array<{ key: string; value: unknown }>;
};

const blobToDataUrl = async (blob: Blob): Promise<string> => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  return `data:${blob.type || "application/octet-stream"};base64,${btoa(binary)}`;
};
const dataUrlToBlob = (dataUrl: string): Blob => {
  const match = /^data:([^;,]+)?;base64,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error("A custom sound in this backup is invalid.");
  const binary = atob(match[2] ?? "");
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new Blob([bytes], { type: match[1] || "application/octet-stream" });
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBackup(value: unknown): value is BackupPayload {
  if (!isRecord(value)) return false;
  return value.app === "UP" && value.schemaVersion === 1 &&
    Array.isArray(value.alarms) && Array.isArray(value.countdowns) &&
    Array.isArray(value.cities) && Array.isArray(value.timers) &&
    Array.isArray(value.settings) &&
    value.settings.every(item => isRecord(item) && typeof item.key === "string" && "value" in item);
}

export class BackupService {
  async export(): Promise<Result<string>> {
    try {
      const db = await getDatabase();
      const [alarms, countdowns, cities, timers, settingValues, settingKeys] = await Promise.all([
        db.getAll("alarms"), db.getAll("countdowns"), db.getAll("cities"),
        db.getAll("timers"), db.getAll("settings"), db.getAllKeys("settings")
      ]);
      const settings = await Promise.all(settingKeys.map(async (key, index) => {
        const name = String(key);
        const value = settingValues[index];
        if (name !== "custom-sounds" || !Array.isArray(value)) return { key: name, value };
        const portable = await Promise.all(value.map(async sound => {
          if (!isRecord(sound) || !(sound.blob instanceof Blob)) return sound;
          const { blob, ...metadata } = sound;
          return { ...metadata, blobDataUrl: await blobToDataUrl(blob), blobType: blob.type };
        }));
        return { key: name, value: portable };
      }));
      const payload: BackupPayload = {
        app: "UP", schemaVersion: 1, exportedAt: new Date().toISOString(),
        alarms, countdowns, cities, timers, settings
      };
      return success(JSON.stringify(payload, null, 2));
    } catch (e) { return failure("BACKUP_EXPORT_FAILED", e instanceof Error ? e.message : "Could not export your UP data."); }
  }

  async import(json: string): Promise<Result<{ alarms: number; countdowns: number; cities: number }>> {
    let payload: unknown;
    try { payload = JSON.parse(json); }
    catch { return failure("INVALID_BACKUP_JSON", "This file is not valid JSON."); }
    if (!isBackup(payload)) return failure("INVALID_BACKUP", "This is not a supported UP backup file.");
    try {
      // Decode portable audio before opening the transaction. IndexedDB transactions
      // can auto-close while awaiting unrelated async work.
      const restoredSettings = await Promise.all(payload.settings.map(async item => {
        if (item.key !== "custom-sounds" || !Array.isArray(item.value)) return item;
        const restored = item.value.map(sound => {
          if (!isRecord(sound) || typeof sound.blobDataUrl !== "string") return sound;
          const { blobDataUrl, blobType, ...metadata } = sound;
          return { ...metadata, blob: dataUrlToBlob(blobDataUrl) };
        });
        return { ...item, value: restored };
      }));
      const db = await getDatabase();
      const tx = db.transaction(["alarms", "countdowns", "cities", "timers", "settings"], "readwrite");
      await Promise.all([
        tx.objectStore("alarms").clear(),
        tx.objectStore("countdowns").clear(),
        tx.objectStore("cities").clear(),
        tx.objectStore("timers").clear(),
        tx.objectStore("settings").clear()
      ]);
      const writes = [
        ...payload.alarms.map(item => tx.objectStore("alarms").put(item)),
        ...payload.countdowns.map(item => tx.objectStore("countdowns").put(item)),
        ...payload.cities.map(item => tx.objectStore("cities").put(item)),
        ...payload.timers.map(item => tx.objectStore("timers").put(item)),
        ...restoredSettings.map(item => tx.objectStore("settings").put(item.value, item.key))
      ];
      await Promise.all(writes);
      await tx.done;
      return success({ alarms: payload.alarms.length, countdowns: payload.countdowns.length, cities: payload.cities.length });
    } catch (e) { return failure("BACKUP_IMPORT_FAILED", e instanceof Error ? e.message : "Could not restore this backup."); }
  }
}
