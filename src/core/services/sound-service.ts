import { failure, success, type Result, type SoundItem } from "../domain/types";
import { getDatabase } from "../storage/database";

const STARTER_SOUNDS: Omit<SoundItem, "isFavourite">[] = [
  { id: "soft-bells", title: "Soft Bells", category: "Soft starts", durationSeconds: 3, source: "bundled" },
  { id: "morning-rain", title: "Morning Rain", category: "Nature", durationSeconds: 3, source: "bundled" },
  { id: "forest-dawn", title: "Forest Dawn", category: "Birds", durationSeconds: 3, source: "bundled" },
  { id: "low-tide", title: "Low Tide", category: "Water", durationSeconds: 3, source: "bundled" },
  { id: "warm-pulse", title: "Warm Pulse", category: "Ambient", durationSeconds: 3, source: "bundled" },
  { id: "bright-start", title: "Bright Start", category: "Bright", durationSeconds: 3, source: "bundled" }
];

const NOTES: Record<string, number[]> = {
  "soft-bells": [659.25, 783.99, 987.77, 783.99],
  "morning-rain": [392, 440, 392, 523.25, 440],
  "forest-dawn": [880, 1174.66, 987.77, 1318.51],
  "low-tide": [261.63, 329.63, 392, 329.63],
  "warm-pulse": [220, 277.18, 329.63, 277.18],
  "bright-start": [523.25, 659.25, 783.99, 1046.5]
};

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
      if (!STARTER_SOUNDS.some(sound => sound.id === soundId)) return failure("SOUND_NOT_FOUND", "That sound is not available.");
      const db = await getDatabase();
      const favourites = new Set((await db.get("settings", "sound-favourites") as string[] | undefined) ?? []);
      favourite ? favourites.add(soundId) : favourites.delete(soundId);
      await db.put("settings", [...favourites], "sound-favourites");
      return success(undefined);
    } catch (e) { return failure("SOUND_FAVOURITE_FAILED", e instanceof Error ? e.message : "Could not update favourite."); }
  }
  async preview(soundId: string): Promise<Result<void>> {
    const notes = NOTES[soundId];
    if (!notes) return failure("SOUND_NOT_FOUND", "That sound is not available.");
    if (typeof AudioContext === "undefined") return failure("AUDIO_UNAVAILABLE", "Audio preview is unavailable in this environment.");
    try {
      const context = new AudioContext();
      await context.resume();
      const start = context.currentTime + 0.04;
      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const at = start + index * 0.42;
        oscillator.type = soundId === "warm-pulse" ? "sine" : "triangle";
        oscillator.frequency.setValueAtTime(frequency, at);
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.12, at + 0.035);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.34);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(at);
        oscillator.stop(at + 0.36);
      });
      window.setTimeout(() => void context.close(), notes.length * 420 + 700);
      return success(undefined);
    } catch (e) { return failure("AUDIO_PREVIEW_FAILED", e instanceof Error ? e.message : "Could not play this preview."); }
  }
}
