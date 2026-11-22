import type { Alarm, AlarmCapabilities } from "../domain/types";

export interface NativeAlarmPlugin {
  schedule(options: { alarm: Alarm; nextOccurrence: string }): Promise<{ state: "scheduled" | "permission_required" | "unsupported" | "failed"; message?: string }>;
  cancel(options: { alarmId: string }): Promise<void>;
  capabilities(): Promise<AlarmCapabilities>;
  requestPermission(): Promise<AlarmCapabilities>;
  test(): Promise<void>;
  pickAlarmSound(options: { existingUri?: string }): Promise<{ cancelled: boolean; uri?: string; title?: string }>;
  consumeCompleted(): Promise<{ alarmIds: string[] }>;
  previewSound(options: { soundId: string }): Promise<void>;
  stopSoundPreview(): Promise<void>;
}
