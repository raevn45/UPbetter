export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type MissionKind = "math" | "memory" | "sequence" | "typing" | "logic" | "checklist" | "movement" | "random";
export type MissionConfig = { kind: MissionKind; difficulty: "easy" | "medium" | "hard"; rounds: number };

export type Alarm = {
  id: string;
  label: string;
  enabled: boolean;
  hour: number;
  minute: number;
  repeatDays: Weekday[];
  timeZone: string;
  soundId: string;
  volume: number;
  gradualVolume: boolean;
  vibration: boolean;
  snoozeMinutes: number;
  mission: MissionConfig | null;
  createdAt: string;
  updatedAt: string;
};

export type AlarmScheduleState = "scheduled" | "saved_only" | "permission_required" | "unsupported" | "failed";
export type AlarmCapabilities = {
  platform: "web" | "windows" | "android" | "ios";
  nativeAlarmSupported: boolean;
  exactScheduling: boolean;
  requiresPermission: boolean;
  permissionGranted: boolean;
  notes: string[];
};
export type AlarmWithStatus = {
  alarm: Alarm;
  scheduleState: AlarmScheduleState;
  nextOccurrence: string | null;
  message?: string;
};

export type Countdown = { id: string; title: string; targetInstant: string; timeZone: string };
export type SavedCity = { id: string; cityName: string; countryCode: string; timeZone: string };
export type SoundItem = {
  id: string;
  title: string;
  category: string;
  durationSeconds: number;
  source: "bundled" | "user";
  attribution?: string;
  previewUrl?: string;
  isFavourite: boolean;
};
export type TimerRecord = {
  id: string;
  label: string;
  durationMs: number;
  endsAt: string;
  remainingMs: number | null;
  paused: boolean;
  createdAt: string;
};

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string; message: string } };

export const success = <T>(value: T): Result<T> => ({ ok: true, value });
export const failure = <T = never>(code: string, message: string): Result<T> => ({ ok: false, error: { code, message } });
