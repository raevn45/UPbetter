import { getDatabase } from "../storage/database";
import { failure, success, type Result } from "../domain/types";

export type UpSettings = {
  catName: string;
  motivationStyle: "direct" | "warm" | "competitive" | "reflective";
  reducedMotion: boolean;
  wakeReason: string;
  pinnedCountdownId: string | null;
};

const DEFAULTS: UpSettings = {
  catName: "Miso",
  motivationStyle: "direct",
  reducedMotion: false,
  wakeReason: "",
  pinnedCountdownId: null
};

export class SettingsService {
  async get(): Promise<Result<UpSettings>> {
    try {
      const db = await getDatabase();
      const saved = await db.get("settings", "preferences") as Partial<UpSettings> | undefined;
      return success({ ...DEFAULTS, ...saved });
    } catch (e) { return failure("SETTINGS_READ_FAILED", e instanceof Error ? e.message : "Could not load settings."); }
  }

  async update(patch: Partial<UpSettings>): Promise<Result<UpSettings>> {
    try {
      const db = await getDatabase();
      const saved = await db.get("settings", "preferences") as Partial<UpSettings> | undefined;
      const next = { ...DEFAULTS, ...saved, ...patch };
      if (!next.catName.trim()) return failure("INVALID_CAT_NAME", "Give your cat a name.");
      await db.put("settings", next, "preferences");
      return success(next);
    } catch (e) { return failure("SETTINGS_WRITE_FAILED", e instanceof Error ? e.message : "Could not save settings."); }
  }
}
