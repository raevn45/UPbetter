import { Capacitor, registerPlugin } from "@capacitor/core";
import type { AlarmScheduler } from "../services/alarm-service";
import type { Alarm, AlarmCapabilities, AlarmWithStatus } from "../domain/types";
import { WebAlarmScheduler } from "../services/alarm-service";
import type { NativeAlarmPlugin } from "./capacitor-alarm-plugin";

const NativeUPAlarm = registerPlugin<NativeAlarmPlugin>("UPAlarm");

export class CapacitorAlarmScheduler implements AlarmScheduler {
  private readonly fallback = new WebAlarmScheduler();

  async schedule(alarm: Alarm): Promise<{ state: AlarmWithStatus["scheduleState"]; message?: string }> {
    if (!Capacitor.isNativePlatform()) return this.fallback.schedule();
    const { nextAlarmOccurrence } = await import("../time/time-service");
    const nextOccurrence = nextAlarmOccurrence(alarm);
    if (!nextOccurrence) return { state: "failed", message: "No upcoming occurrence could be calculated." };
    try {
      return await NativeUPAlarm.schedule({ alarm, nextOccurrence });
    } catch (error) {
      return { state: "failed", message: error instanceof Error ? error.message : "Native alarm scheduling failed." };
    }
  }

  async consumeCompleted(): Promise<string[]> {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return [];
    const result = await NativeUPAlarm.consumeCompleted();
    return result.alarmIds ?? [];
  }

  async cancel(alarmId: string): Promise<void> {
    if (Capacitor.isNativePlatform()) await NativeUPAlarm.cancel({ alarmId });
  }

  async capabilities(): Promise<AlarmCapabilities> {
    return Capacitor.isNativePlatform() ? NativeUPAlarm.capabilities() : this.fallback.capabilities();
  }

  async requestPermission(): Promise<AlarmCapabilities> {
    return Capacitor.isNativePlatform() ? NativeUPAlarm.requestPermission() : this.fallback.requestPermission();
  }

  async test(): Promise<void> {
    if (Capacitor.isNativePlatform()) return NativeUPAlarm.test();
    return this.fallback.test();
  }
}

export const createAlarmScheduler = (): AlarmScheduler => new CapacitorAlarmScheduler();


export async function pickNativeAlarmSound(existingUri?: string) {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    return { supported: false as const, cancelled: true as const };
  }
  const result = await NativeUPAlarm.pickAlarmSound(existingUri ? { existingUri } : {});
  return { supported: true as const, ...result };
}
