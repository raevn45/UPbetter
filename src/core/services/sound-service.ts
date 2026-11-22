import { failure, success, type Result, type SoundItem } from "../domain/types";
import { getDatabase } from "../storage/database";

type LibrarySound = Omit<SoundItem, "isFavourite">;
type CustomSoundRecord = { id: string; title: string; category: "Custom"; durationSeconds: number; source: "user"; attribution: string; blob: Blob };

const SOUND_LIBRARY: LibrarySound[] = [
  { id: "device-alarm", title: "Device Alarm", category: "Alarm", durationSeconds: 8, source: "bundled", attribution: "Uses your device's default alarm tone" },
  { id: "alarm-twinbell", title: "Twin Bell", category: "Alarm", durationSeconds: 30, source: "bundled", attribution: "Original UP alarm tone · generated locally" },
  { id: "alarm-digital", title: "Digital Beeps", category: "Alarm", durationSeconds: 30, source: "bundled", attribution: "Original UP alarm tone · generated locally" },
  { id: "alarm-buzzer", title: "Classic Buzzer", category: "Alarm", durationSeconds: 30, source: "bundled", attribution: "Original UP alarm tone · generated locally" },
  { id: "alarm-pulse", title: "Pulse Alarm", category: "Alarm", durationSeconds: 30, source: "bundled", attribution: "Original UP alarm tone · generated locally" },
  { id: "alarm-rise", title: "Rising Alarm", category: "Alarm", durationSeconds: 30, source: "bundled", attribution: "Original UP alarm tone · generated locally" },
  { id: "rain-soft", title: "Rain on the Window", category: "Rain", durationSeconds: 8, source: "bundled", previewUrl: "https://github.com/DNAABR/ambient-sounds-library/releases/download/v0.1.0-preview/rain-soft.wav", attribution: "CC0 1.0 · barkenov · Freesound 640655" },
  { id: "rain-heavy", title: "Rainstorm", category: "Rain", durationSeconds: 8, source: "bundled", previewUrl: "https://github.com/Leminno-org/ambient-sounds-library/releases/download/v0.4.0-preview/rain-heavy.wav", attribution: "CC0 1.0 · Leminno original sound design" },
  { id: "rain-tin-roof", title: "Rain on a Tin Roof", category: "Rain", durationSeconds: 8, source: "bundled", previewUrl: "https://github.com/Leminno-org/ambient-sounds-library/releases/download/v0.4.0-preview/rain-tin-roof.wav", attribution: "CC0 1.0 · Leminno original sound design" },
  { id: "rain-leaves", title: "Rain in the Leaves", category: "Rain", durationSeconds: 8, source: "bundled", previewUrl: "https://github.com/Leminno-org/ambient-sounds-library/releases/download/v0.4.0-preview/rain-leaves.wav", attribution: "CC0 1.0 · Leminno original sound design" },
  { id: "water-stream", title: "Little Brook", category: "Water", durationSeconds: 8, source: "bundled", previewUrl: "https://github.com/DNAABR/ambient-sounds-library/releases/download/v0.3.0-preview/water-stream.wav", attribution: "CC0 1.0 · SamsterBirdies · Freesound 584269" },
  { id: "water-river", title: "River Current", category: "Water", durationSeconds: 8, source: "bundled", previewUrl: "https://github.com/DNAABR/ambient-sounds-library/releases/download/v0.2.0-preview/water-river.wav", attribution: "CC0 1.0 · JW_Audio · Freesound 810231" },
  { id: "water-surf", title: "Ocean Shore", category: "Water", durationSeconds: 8, source: "bundled", previewUrl: "https://github.com/Leminno-org/ambient-sounds-library/releases/download/v0.4.0-preview/water-surf.wav", attribution: "CC0 1.0 · Leminno original sound design" },
  { id: "wind-breeze", title: "Open Window", category: "Wind", durationSeconds: 8, source: "bundled", previewUrl: "https://github.com/DNAABR/ambient-sounds-library/releases/download/v0.3.0-preview/wind-breeze.wav", attribution: "CC0 1.0 · keweldog · Freesound 181801" },
  { id: "wind-pines", title: "Wind Through Pines", category: "Wind", durationSeconds: 8, source: "bundled", previewUrl: "https://github.com/Leminno-org/ambient-sounds-library/releases/download/v0.4.0-preview/wind-pines.wav", attribution: "CC0 1.0 · Leminno original sound design" },
  { id: "nature-forest-day", title: "Forest Morning", category: "Nature", durationSeconds: 8, source: "bundled", previewUrl: "https://github.com/DNAABR/ambient-sounds-library/releases/download/v0.3.0-preview/nature-forest-day.wav", attribution: "CC0 1.0 · Sadiquecat · Freesound 799439" },
  { id: "nature-jungle", title: "Jungle Canopy", category: "Nature", durationSeconds: 8, source: "bundled", previewUrl: "https://github.com/Leminno-org/ambient-sounds-library/releases/download/v0.4.0-preview/nature-jungle.wav", attribution: "CC0 1.0 · Leminno original sound design" },
  { id: "nature-meadow", title: "Meadow at Dawn", category: "Nature", durationSeconds: 8, source: "bundled", previewUrl: "https://github.com/Leminno-org/ambient-sounds-library/releases/download/v0.4.0-preview/nature-meadow.wav", attribution: "CC0 1.0 · Leminno original sound design" },
  { id: "fire-camp", title: "Campfire", category: "Fire", durationSeconds: 8, source: "bundled", previewUrl: "https://github.com/Leminno-org/ambient-sounds-library/releases/download/v0.4.0-preview/fire-camp.wav", attribution: "CC0 1.0 · Leminno original sound design" },
  { id: "fire-stove", title: "Fireplace", category: "Fire", durationSeconds: 8, source: "bundled", previewUrl: "https://github.com/Leminno-org/ambient-sounds-library/releases/download/v0.4.0-preview/fire-stove.wav", attribution: "CC0 1.0 · Leminno original sound design" },
  { id: "animals-cat", title: "Miso's Purr", category: "Animals", durationSeconds: 8, source: "bundled", previewUrl: "https://github.com/DNAABR/ambient-sounds-library/releases/download/v0.3.0-preview/animals-cat.wav", attribution: "CC0 1.0 · Trautwein · Freesound 260881" },
  { id: "animals-owl", title: "Night Owl", category: "Animals", durationSeconds: 8, source: "bundled", previewUrl: "https://github.com/Leminno-org/ambient-sounds-library/releases/download/v0.4.0-preview/animals-owl.wav", attribution: "CC0 1.0 · Leminno original sound design" },
  { id: "animals-frogs", title: "Frogs by the Pond", category: "Animals", durationSeconds: 8, source: "bundled", previewUrl: "https://github.com/Leminno-org/ambient-sounds-library/releases/download/v0.4.0-preview/animals-frogs.wav", attribution: "CC0 1.0 · Leminno original sound design" },
  { id: "home-air-conditioner", title: "Quiet Room", category: "Ambient", durationSeconds: 8, source: "bundled", previewUrl: "https://github.com/DNAABR/ambient-sounds-library/releases/download/v0.3.0-preview/home-air-conditioner.wav", attribution: "CC0 1.0 · TimBahrij · Freesound 234918" },
  { id: "city-distant-traffic", title: "City from Afar", category: "City", durationSeconds: 8, source: "bundled", previewUrl: "https://github.com/Leminno-org/ambient-sounds-library/releases/download/v0.4.0-preview/city-distant-traffic.wav", attribution: "CC0 1.0 · Leminno original sound design" },
  { id: "space-library", title: "The Quiet Observatory", category: "Space", durationSeconds: 8, source: "bundled", previewUrl: "https://github.com/Leminno-org/ambient-sounds-library/releases/download/v0.4.0-preview/space-library.wav", attribution: "CC0 1.0 · Leminno original sound design" },
  { id: "texture-clock", title: "Soft Clockwork", category: "Texture", durationSeconds: 8, source: "bundled", previewUrl: "https://github.com/Leminno-org/ambient-sounds-library/releases/download/v0.4.0-preview/texture-clock.wav", attribution: "CC0 1.0 · Leminno original sound design" },
  { id: "travel-airplane", title: "Cabin Ambience", category: "Travel", durationSeconds: 8, source: "bundled", previewUrl: "https://github.com/Leminno-org/ambient-sounds-library/releases/download/v0.4.0-preview/travel-airplane.wav", attribution: "CC0 1.0 · Leminno original sound design" }
];

export class SoundService {
  private activeAudio: HTMLAudioElement | null = null;
  private previewTimeout: number | null = null;
  private activeObjectUrl: string | null = null;
  private activeContext: AudioContext | null = null;
  private activeOscillator: OscillatorNode | null = null;

  async list(): Promise<Result<SoundItem[]>> {
    try {
      const db = await getDatabase();
      const favourites = (await db.get("settings", "sound-favourites") as string[] | undefined) ?? [];
      const custom = (await db.get("settings", "custom-sounds") as CustomSoundRecord[] | undefined) ?? [];
      return success([...SOUND_LIBRARY, ...custom.map(({ blob: _blob, ...sound }) => sound)].map(sound => ({ ...sound, isFavourite: favourites.includes(sound.id) })));
    } catch (e) {
      return failure("SOUND_LIST_FAILED", e instanceof Error ? e.message : "Could not load sounds.");
    }
  }

  async setFavourite(soundId: string, favourite: boolean): Promise<Result<void>> {
    try {
      const db = await getDatabase();
      const available = [...SOUND_LIBRARY.map(sound => sound.id), ...(((await db.get("settings", "custom-sounds") as CustomSoundRecord[] | undefined) ?? []).map(sound => sound.id))];
      if (!available.includes(soundId)) return failure("SOUND_NOT_FOUND", "That sound is not available.");
      const favourites = new Set((await db.get("settings", "sound-favourites") as string[] | undefined) ?? []);
      favourite ? favourites.add(soundId) : favourites.delete(soundId);
      await db.put("settings", [...favourites], "sound-favourites");
      return success(undefined);
    } catch (e) {
      return failure("SOUND_FAVOURITE_FAILED", e instanceof Error ? e.message : "Could not update favourite.");
    }
  }

  stopPreview() {
    if (this.previewTimeout !== null && typeof window !== "undefined") window.clearTimeout(this.previewTimeout);
    this.previewTimeout = null;
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio.currentTime = 0;
      this.activeAudio = null;
    }
    if (this.activeObjectUrl) { URL.revokeObjectURL(this.activeObjectUrl); this.activeObjectUrl = null; }
    if (this.activeOscillator) { try { this.activeOscillator.stop(); } catch { /* already stopped */ } this.activeOscillator = null; }
    if (this.activeContext) { void this.activeContext.close(); this.activeContext = null; }
  }

  async importCustom(file: File): Promise<Result<SoundItem>> {
    if (!file.type.startsWith("audio/")) return failure("INVALID_AUDIO", "Choose an audio file.");
    if (file.size > 20 * 1024 * 1024) return failure("AUDIO_TOO_LARGE", "Custom sounds must be 20 MB or smaller.");
    try {
      const db = await getDatabase();
      const custom = (await db.get("settings", "custom-sounds") as CustomSoundRecord[] | undefined) ?? [];
      const title = file.name.replace(/\.[^.]+$/, "").slice(0, 48) || "My sound";
      const record: CustomSoundRecord = { id: `custom-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`, title, category: "Custom", durationSeconds: 30, source: "user", attribution: "Imported from your device", blob: file };
      await db.put("settings", [...custom, record], "custom-sounds");
      return success({ id: record.id, title: record.title, category: record.category, durationSeconds: record.durationSeconds, source: record.source, attribution: record.attribution, isFavourite: false });
    } catch (e) {
      return failure("CUSTOM_SOUND_IMPORT_FAILED", e instanceof Error ? e.message : "Could not import that audio file.");
    }
  }

  async removeCustom(soundId: string): Promise<Result<void>> {
    try {
      const db = await getDatabase();
      const custom = (await db.get("settings", "custom-sounds") as CustomSoundRecord[] | undefined) ?? [];
      await db.put("settings", custom.filter(sound => sound.id !== soundId), "custom-sounds");
      const favourites = (await db.get("settings", "sound-favourites") as string[] | undefined) ?? [];
      await db.put("settings", favourites.filter(id => id !== soundId), "sound-favourites");
      return success(undefined);
    } catch (e) {
      return failure("CUSTOM_SOUND_REMOVE_FAILED", e instanceof Error ? e.message : "Could not remove that sound.");
    }
  }

  async recentlyUsed(): Promise<Result<string[]>> {
    try {
      const db = await getDatabase();
      return success((await db.get("settings", "sound-recent") as string[] | undefined) ?? []);
    } catch (e) {
      return failure("SOUND_RECENT_FAILED", e instanceof Error ? e.message : "Could not load recent sounds.");
    }
  }

  async preview(soundId: string): Promise<Result<void>> {
    const sound = SOUND_LIBRARY.find(item => item.id === soundId);
    if (typeof Audio === "undefined") return failure("AUDIO_UNAVAILABLE", "Audio preview is unavailable in this environment.");
    try {
      this.stopPreview();
      let source = sound?.previewUrl;
      let duration = sound?.durationSeconds ?? 30;
      if (soundId === "device-alarm") {
        return failure("NATIVE_ALARM_SOUND", "The device alarm tone is provided by Android or iOS. Open the native app to preview the actual system sound.");
      }
      if (!sound) {
        const db = await getDatabase();
        const custom = (await db.get("settings", "custom-sounds") as CustomSoundRecord[] | undefined) ?? [];
        const record = custom.find(item => item.id === soundId);
        if (!record) return failure("SOUND_NOT_FOUND", "That sound is not available.");
        source = URL.createObjectURL(record.blob);
        this.activeObjectUrl = source;
        duration = record.durationSeconds;
      }
      if (!source) return failure("SOUND_NOT_FOUND", "That sound is not available.");
      const audio = new Audio(source);
      audio.preload = "auto";
      audio.loop = true;
      audio.volume = 0.78;
      this.activeAudio = audio;
      await audio.play();
      this.previewTimeout = window.setTimeout(() => this.stopPreview(), duration * 1000);
      const db = await getDatabase();
      const recent = (await db.get("settings", "sound-recent") as string[] | undefined) ?? [];
      await db.put("settings", [soundId, ...recent.filter(id => id !== soundId)].slice(0, 8), "sound-recent");
      return success(undefined);
    } catch (e) {
      this.stopPreview();
      return failure("AUDIO_PREVIEW_FAILED", e instanceof Error ? e.message : "Could not play this preview. Check your connection and try again.");
    }
  }
}
