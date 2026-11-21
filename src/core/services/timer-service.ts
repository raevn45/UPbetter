import { failure, success, type Result, type TimerRecord } from "../domain/types";
import { localStore } from "../storage/database";

const id = () => globalThis.crypto?.randomUUID?.() ?? `timer-${Date.now()}`;
export class TimerService {
  async start(durationMs: number, label = "Timer"): Promise<Result<{ id: string }>> {
    try {
      if (!Number.isFinite(durationMs) || durationMs <= 0) return failure("INVALID_DURATION", "Timer duration must be greater than zero.");
      const timer: TimerRecord = { id: id(), label: label.trim() || "Timer", durationMs, endsAt: new Date(Date.now() + durationMs).toISOString(), remainingMs: null, paused: false, createdAt: new Date().toISOString() };
      await localStore.put("timers", timer);
      return success({ id: timer.id });
    } catch (e) { return failure("TIMER_START_FAILED", e instanceof Error ? e.message : "Could not start timer."); }
  }
  async pause(timerId: string): Promise<Result<void>> {
    try {
      const timer = await localStore.get("timers", timerId);
      if (!timer) return failure("NOT_FOUND", "Timer not found.");
      const remainingMs = Math.max(0, new Date(timer.endsAt).getTime() - Date.now());
      await localStore.put("timers", { ...timer, paused: true, remainingMs });
      return success(undefined);
    } catch (e) { return failure("TIMER_PAUSE_FAILED", e instanceof Error ? e.message : "Could not pause timer."); }
  }
  async resume(timerId: string): Promise<Result<void>> {
    try {
      const timer = await localStore.get("timers", timerId);
      if (!timer) return failure("NOT_FOUND", "Timer not found.");
      const remainingMs = timer.remainingMs ?? 0;
      await localStore.put("timers", { ...timer, paused: false, remainingMs: null, endsAt: new Date(Date.now() + remainingMs).toISOString() });
      return success(undefined);
    } catch (e) { return failure("TIMER_RESUME_FAILED", e instanceof Error ? e.message : "Could not resume timer."); }
  }
  async cancel(timerId: string): Promise<Result<void>> {
    try { await localStore.delete("timers", timerId); return success(undefined); }
    catch (e) { return failure("TIMER_CANCEL_FAILED", e instanceof Error ? e.message : "Could not cancel timer."); }
  }
  async list(): Promise<Result<Array<{ id: string; label: string; endsAt: string; paused: boolean }>>> {
    try {
      const records = await localStore.all("timers");
      return success(records.map(({ id, label, endsAt, paused, remainingMs }) => ({ id, label, endsAt: paused && remainingMs !== null ? new Date(Date.now() + remainingMs).toISOString() : endsAt, paused })));
    } catch (e) { return failure("TIMER_LIST_FAILED", e instanceof Error ? e.message : "Could not load timers."); }
  }
}
