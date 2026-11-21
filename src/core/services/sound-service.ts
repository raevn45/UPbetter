import { failure, success, type Result, type SoundItem } from "../domain/types";
import { getDatabase } from "../storage/database";

type SoundPreset = Omit<SoundItem, "isFavourite"> & {
  notes: number[];
  wave: OscillatorType;
  interval: number;
  tone: number;
  texture?: "rain" | "ocean" | "wind" | "birds" | "vinyl";
};

const STARTER_SOUNDS: SoundPreset[] = [
  { id: "soft-bells", title: "Soft Bells", category: "Gentle", durationSeconds: 8, source: "bundled", notes: [659, 784, 988, 784, 659], wave: "sine", interval: .72, tone: .12 },
  { id: "morning-rain", title: "Rain on Glass", category: "Nature", durationSeconds: 8, source: "bundled", notes: [392, 440, 523, 440], wave: "sine", interval: 1.1, tone: .055, texture: "rain" },
  { id: "forest-dawn", title: "Forest Dawn", category: "Nature", durationSeconds: 8, source: "bundled", notes: [880, 1175, 988, 1319, 1175], wave: "sine", interval: .58, tone: .07, texture: "birds" },
  { id: "low-tide", title: "Low Tide", category: "Nature", durationSeconds: 8, source: "bundled", notes: [262, 330, 392, 330], wave: "sine", interval: 1.25, tone: .09, texture: "ocean" },
  { id: "warm-pulse", title: "Warm Pulse", category: "Ambient", durationSeconds: 8, source: "bundled", notes: [220, 277, 330, 277], wave: "triangle", interval: .9, tone: .12 },
  { id: "bright-start", title: "First Light", category: "Bright", durationSeconds: 8, source: "bundled", notes: [523, 659, 784, 1047, 784, 659], wave: "triangle", interval: .48, tone: .075 },
  { id: "amber-room", title: "Amber Room", category: "Gentle", durationSeconds: 8, source: "bundled", notes: [392, 494, 587, 494, 440], wave: "sine", interval: .82, tone: .09 },
  { id: "glass-garden", title: "Glass Garden", category: "Gentle", durationSeconds: 8, source: "bundled", notes: [1047, 784, 1175, 988, 1319], wave: "sine", interval: .66, tone: .065 },
  { id: "slow-sunday", title: "Slow Sunday", category: "Ambient", durationSeconds: 8, source: "bundled", notes: [196, 247, 294, 247], wave: "triangle", interval: 1.35, tone: .11 },
  { id: "blue-hour", title: "Blue Hour", category: "Ambient", durationSeconds: 8, source: "bundled", notes: [294, 349, 440, 349, 330], wave: "sine", interval: 1, tone: .08 },
  { id: "little-orbit", title: "Little Orbit", category: "Playful", durationSeconds: 8, source: "bundled", notes: [659, 880, 784, 988, 1175, 988], wave: "square", interval: .42, tone: .035 },
  { id: "paper-cranes", title: "Paper Cranes", category: "Playful", durationSeconds: 8, source: "bundled", notes: [587, 698, 880, 698, 784], wave: "triangle", interval: .62, tone: .045 },
  { id: "woodland", title: "Woodland", category: "Nature", durationSeconds: 8, source: "bundled", notes: [330, 392, 494, 392], wave: "sine", interval: .95, tone: .055, texture: "wind" },
  { id: "copper-chime", title: "Copper Chime", category: "Bright", durationSeconds: 8, source: "bundled", notes: [784, 659, 988, 880, 1175], wave: "triangle", interval: .55, tone: .1 },
  { id: "soft-focus", title: "Soft Focus", category: "Ambient", durationSeconds: 8, source: "bundled", notes: [261, 392, 523, 392], wave: "sine", interval: 1.15, tone: .065 },
  { id: "marigold", title: "Marigold", category: "Bright", durationSeconds: 8, source: "bundled", notes: [440, 554, 659, 880, 659], wave: "triangle", interval: .5, tone: .085 },
  { id: "vinyl-morning", title: "Vinyl Morning", category: "Ambient", durationSeconds: 8, source: "bundled", notes: [220, 330, 392, 330], wave: "sine", interval: 1.05, tone: .055, texture: "vinyl" },
  { id: "tiny-disco", title: "Tiny Disco", category: "Playful", durationSeconds: 8, source: "bundled", notes: [523, 659, 784, 659, 988, 784], wave: "square", interval: .32, tone: .025 }
];

export class SoundService {
  private activeContext: AudioContext | null = null;

  async list(): Promise<Result<SoundItem[]>> {
    try {
      const db = await getDatabase();
      const favourites = (await db.get("settings", "sound-favourites") as string[] | undefined) ?? [];
      return success(STARTER_SOUNDS.map(({ notes: _n, wave: _w, interval: _i, tone: _t, texture: _x, ...sound }) => ({ ...sound, isFavourite: favourites.includes(sound.id) })));
    } catch (e) { return failure("SOUND_LIST_FAILED", e instanceof Error ? e.message : "Could not load sounds."); }
  }

  async setFavourite(soundId: string, favourite: boolean): Promise<Result<void>> {
    if (!STARTER_SOUNDS.some(sound => sound.id === soundId)) return failure("SOUND_NOT_FOUND", "That sound is not available.");
    try {
      const db = await getDatabase();
      const favourites = new Set((await db.get("settings", "sound-favourites") as string[] | undefined) ?? []);
      favourite ? favourites.add(soundId) : favourites.delete(soundId);
      await db.put("settings", [...favourites], "sound-favourites");
      return success(undefined);
    } catch (e) { return failure("SOUND_FAVOURITE_FAILED", e instanceof Error ? e.message : "Could not update favourite."); }
  }

  async preview(soundId: string): Promise<Result<void>> {
    const preset = STARTER_SOUNDS.find(sound => sound.id === soundId);
    if (!preset) return failure("SOUND_NOT_FOUND", "That sound is not available.");
    if (typeof AudioContext === "undefined") return failure("AUDIO_UNAVAILABLE", "Audio preview is unavailable in this environment.");
    try {
      if (this.activeContext) { await this.activeContext.close(); this.activeContext = null; }
      const context = new AudioContext();
      this.activeContext = context;
      await context.resume();
      const master = context.createGain();
      master.gain.value = .7;
      master.connect(context.destination);
      const start = context.currentTime + .08;
      preset.notes.forEach((frequency, index) => {
        const at = start + index * preset.interval;
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        const filter = context.createBiquadFilter();
        oscillator.type = preset.wave;
        oscillator.frequency.setValueAtTime(frequency, at);
        oscillator.detune.setValueAtTime(index % 2 ? -4 : 4, at);
        filter.type = "lowpass";
        filter.frequency.value = preset.wave === "square" ? 1500 : 3200;
        envelope.gain.setValueAtTime(.0001, at);
        envelope.gain.exponentialRampToValueAtTime(preset.tone, at + .08);
        envelope.gain.exponentialRampToValueAtTime(.0001, at + preset.interval * .88);
        oscillator.connect(filter);
        filter.connect(envelope);
        envelope.connect(master);
        oscillator.start(at);
        oscillator.stop(at + preset.interval);
      });
      if (preset.texture) this.addTexture(context, master, start, preset.texture);
      window.setTimeout(() => { if (this.activeContext === context) { void context.close(); this.activeContext = null; } }, preset.notes.length * preset.interval * 1000 + 500);
      return success(undefined);
    } catch (e) { return failure("AUDIO_PREVIEW_FAILED", e instanceof Error ? e.message : "Could not play this preview."); }
  }

  private addTexture(context: AudioContext, destination: AudioNode, start: number, texture: NonNullable<SoundPreset["texture"]>) {
    const length = Math.floor(context.sampleRate * 5.5);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (texture === "vinyl" ? .12 : .28);
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = texture === "birds" ? "highpass" : "lowpass";
    filter.frequency.value = texture === "rain" ? 900 : texture === "ocean" ? 420 : texture === "wind" ? 260 : texture === "birds" ? 2400 : 1800;
    gain.gain.value = texture === "vinyl" ? .025 : .055;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start(start);
    source.stop(start + 5.2);
  }
}
