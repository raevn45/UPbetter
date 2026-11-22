import { failure, success, type Result, type TimerRecord } from "../domain/types";
import { localStore } from "../storage/database";
import { Capacitor, registerPlugin } from "@capacitor/core";

interface NativeTimerPlugin {
  scheduleTimer(options: { timerId: string; label: string; endsAt: string }): Promise<{ state: "scheduled" | "permission_required" | "failed"; message?: string }>;
  cancelTimer(options: { timerId: string }): Promise<void>;
}
const NativeUPTimer = registerPlugin<NativeTimerPlugin>("UPAlarm");
const scheduleNative = async (timer: TimerRecord): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  const result = await NativeUPTimer.scheduleTimer({ timerId: timer.id, label: timer.label, endsAt: timer.endsAt });
  if (result.state !== "scheduled") throw new Error(result.message || "Could not schedule this timer on the device.");
};

const id = () => globalThis.crypto?.randomUUID?.() ?? `timer-${Date.now()}`;
export class TimerService {
  async start(durationMs: number, label = "Timer"): Promise<Result<{ id: string }>> {
    try {
      if (!Number.isFinite(durationMs) || durationMs <= 0) return failure("INVALID_DURATION", "Timer duration must be greater than zero.");
      const timer: TimerRecord = { id: id(), label: label.trim() || "Timer", durationMs, endsAt: new Date(Date.now() + durationMs).toISOString(), remainingMs: null, paused: false, createdAt: new Date().toISOString() };
      await localStore.put("timers", timer);
      try { await scheduleNative(timer); }
      catch (error) { await localStore.delete("timers", timer.id); throw error; }
      return success({ id: timer.id });
    } catch (e) { return failure("TIMER_START_FAILED", e instanceof Error ? e.message : "Could not start timer."); }
  }
  async pause(timerId: string): Promise<Result<void>> {
    try {
      const timer = await localStore.get("timers", timerId);
      if (!timer) return failure("NOT_FOUND", "Timer not found.");
      const remainingMs = Math.max(0, new Date(timer.endsAt).getTime() - Date.now());
      if (Capacitor.isNativePlatform()) await NativeUPTimer.cancelTimer({ timerId });
      await localStore.put("timers", { ...timer, paused: true, remainingMs });
      return success(undefined);
    } catch (e) { return failure("TIMER_PAUSE_FAILED", e instanceof Error ? e.message : "Could not pause timer."); }
  }
  async resume(timerId: string): Promise<Result<void>> {
    try {
      const timer = await localStore.get("timers", timerId);
      if (!timer) return failure("NOT_FOUND", "Timer not found.");
      const remainingMs = timer.remainingMs ?? 0;
      const resumed = { ...timer, paused: false, remainingMs: null, endsAt: new Date(Date.now() + remainingMs).toISOString() };
      await localStore.put("timers", resumed);
      try { await scheduleNative(resumed); }
      catch (error) { await localStore.put("timers", { ...timer, paused: true, remainingMs }); throw error; }
      return success(undefined);
    } catch (e) { return failure("TIMER_RESUME_FAILED", e instanceof Error ? e.message : "Could not resume timer."); }
  }
  async cancel(timerId: string): Promise<Result<void>> {
    try { if (Capacitor.isNativePlatform()) await NativeUPTimer.cancelTimer({ timerId }); await localStore.delete("timers", timerId); return success(undefined); }
    catch (e) { return failure("TIMER_CANCEL_FAILED", e instanceof Error ? e.message : "Could not cancel timer."); }
  }
  async list(): Promise<Result<Array<{ id: string; label: string; endsAt: string; paused: boolean }>>> {
    try {
      const records = await localStore.all("timers");
      return success(records.map(({ id, label, endsAt, paused, remainingMs }) => ({ id, label, endsAt: paused && remainingMs !== null ? new Date(Date.now() + remainingMs).toISOString() : endsAt, paused })));
    } catch (e) { return failure("TIMER_LIST_FAILED", e instanceof Error ? e.message : "Could not load timers."); }
  }
}
