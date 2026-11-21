import { failure, success, type Result, type SoundItem } from "../domain/types";
import { getDatabase } from "../storage/database";

const STARTER_SOUNDS: Omit<SoundItem, "isFavourite">[] = [
  { id: "soft-bells", title: "Soft Bells", category: "Soft starts", durationSeconds: 12, source: "bundled" },
  { id: "morning-rain", title: "Morning Rain", category: "Nature", durationSeconds: 18, source: "bundled" },
  { id: "forest-dawn", title: "Forest Dawn", category: "Birds", durationSeconds: 16, source: "bundled" },
  { id: "low-tide", title: "Low Tide", category: "Water", durationSeconds: 20, source: "bundled" },
  { id: "warm-pulse", title: "Warm Pulse", category: "Ambient", durationSeconds: 10, source: "bundled" },
  { id: "bright-start", title: "Bright Start", category: "Bright", durationSeconds: 9, source: "bundled" }
];

export class SoundService {
  async list(): Promise<Result<SoundItem[]>> {
    try {
      const db = await getDatabase();
      const favourites = (await db.get("settings", "sound-favourites") as string[] | undefined) ?? [];
      return success(STARTER_SOUNDS.map(sound => ({ ...sound, isFavourite: favourites.includes(sound.id) })));
    } catch (e) { return failure("SOUND_LIST_FAILED", e instanceof Error ? e.message : "Could not load sounds."); }
  }
  async setFavourite(soundId: string, favourite: boolean): Promise<Result<void>> {
    try {
      const db = await getDatabase();
      const favourites = new Set((await db.get("settings", "sound-favourites") as string[] | undefined) ?? []);
      favourite ? favourites.add(soundId) : favourites.delete(soundId);
      await db.put("settings", [...favourites], "sound-favourites");
      return success(undefined);
    } catch (e) { return failure("SOUND_FAVOURITE_FAILED", e instanceof Error ? e.message : "Could not update favourite."); }
  }
  async preview(soundId: string): Promise<Result<void>> {
    const sound = STARTER_SOUNDS.find(item => item.id === soundId);
    if (!sound) return failure("SOUND_NOT_FOUND", "That sound is not available.");
    // Audio assets are added by the frontend/audio integration milestone.
    return failure("AUDIO_ASSET_PENDING", "The sound catalogue is ready; bundled audio files have not been added yet.");
  }
}
