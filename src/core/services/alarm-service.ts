import { failure, success, type Alarm, type AlarmCapabilities, type AlarmWithStatus, type Result, type Weekday } from "../domain/types";
import { localStore } from "../storage/database";
import { nextAlarmOccurrence } from "../time/time-service";

export interface AlarmScheduler {
  schedule(alarm: Alarm): Promise<{ state: AlarmWithStatus["scheduleState"]; message?: string }>;
  cancel(alarmId: string): Promise<void>;
  capabilities(): Promise<AlarmCapabilities>;
  requestPermission(): Promise<AlarmCapabilities>;
  test(): Promise<void>;
}

/** Safe web fallback: persists alarms but never pretends it can ring after the app closes. */
export class WebAlarmScheduler implements AlarmScheduler {
  async schedule() {
    return { state: "saved_only" as const, message: "Saved in UP. Background alarm scheduling is not available in the web runtime." };
  }
  async cancel() {}
  async capabilities(): Promise<AlarmCapabilities> {
    return { platform: "web", nativeAlarmSupported: false, exactScheduling: false, requiresPermission: false, permissionGranted: false, notes: ["Web alarms are foreground-only. Install a native UP app for reliable background alarms."] };
  }
  async requestPermission() { return this.capabilities(); }
  async test() { throw new Error("A native alarm engine is not connected in this build."); }
}

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `up-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const validInput = (input: Omit<Alarm, "id" | "createdAt" | "updatedAt">) =>
  Number.isInteger(input.hour) && input.hour >= 0 && input.hour <= 23 &&
  Number.isInteger(input.minute) && input.minute >= 0 && input.minute <= 59 &&
  input.volume >= 0 && input.volume <= 1 && input.snoozeMinutes >= 0 &&
  input.repeatDays.every(day => Number.isInteger(day) && day >= 0 && day <= 6);

export class AlarmService {
  constructor(private scheduler: AlarmScheduler = new WebAlarmScheduler()) {}

  private async withStatus(alarm: Alarm): Promise<AlarmWithStatus> {
    const scheduling = alarm.enabled ? await this.scheduler.schedule(alarm) : { state: "saved_only" as const, message: "Alarm is disabled." };
    let nextOccurrence: string | null = null;
    if (alarm.enabled) nextOccurrence = nextAlarmOccurrence(alarm);
    return { alarm, scheduleState: scheduling.state, nextOccurrence, ...(scheduling.message ? { message: scheduling.message } : {}) };
  }

  async list(): Promise<Result<AlarmWithStatus[]>> {
    try {
      const alarms = await localStore.all("alarms");
      const values = await Promise.all(alarms.map(alarm => this.withStatus(alarm)));
      return success(values.sort((a, b) => (a.nextOccurrence ?? "").localeCompare(b.nextOccurrence ?? "")));
    } catch (e) { return failure("ALARM_LIST_FAILED", e instanceof Error ? e.message : "Could not load alarms."); }
  }

  async create(input: Omit<Alarm, "id" | "createdAt" | "updatedAt">): Promise<Result<AlarmWithStatus>> {
    try {
      if (!validInput(input)) return failure("INVALID_ALARM", "Check the alarm time, volume, repeat days and snooze duration.");
      nextAlarmOccurrence(input); // Validate timezone and recurrence before saving.
      const now = new Date().toISOString();
      const alarm: Alarm = { ...input, id: makeId(), createdAt: now, updatedAt: now };
      await localStore.put("alarms", alarm);
      return success(await this.withStatus(alarm));
    } catch (e) { return failure("ALARM_CREATE_FAILED", e instanceof Error ? e.message : "Could not create alarm."); }
  }

  async update(id: string, patch: Partial<Omit<Alarm, "id" | "createdAt">>): Promise<Result<AlarmWithStatus>> {
    try {
      const current = await localStore.get("alarms", id);
      if (!current) return failure("NOT_FOUND", "That alarm no longer exists.");
      const alarm = { ...current, ...patch, id, updatedAt: new Date().toISOString() };
      if (!validInput(alarm)) return failure("INVALID_ALARM", "Check the alarm settings.");
      nextAlarmOccurrence(alarm);
      await localStore.put("alarms", alarm);
      return success(await this.withStatus(alarm));
    } catch (e) { return failure("ALARM_UPDATE_FAILED", e instanceof Error ? e.message : "Could not update alarm."); }
  }

  async remove(id: string): Promise<Result<void>> {
    try { await this.scheduler.cancel(id); await localStore.delete("alarms", id); return success(undefined); }
    catch (e) { return failure("ALARM_DELETE_FAILED", e instanceof Error ? e.message : "Could not delete alarm."); }
  }

  async setEnabled(id: string, enabled: boolean) { return this.update(id, { enabled }); }
  getCapabilities() { return this.scheduler.capabilities(); }
  requestAlarmPermission() { return this.scheduler.requestPermission(); }
  testAlarm() { return this.scheduler.test(); }
}

export type AlarmInput = Omit<Alarm, "id" | "createdAt" | "updatedAt">;
export type { Weekday };
