# UP — Frontend/backend contract (v1)

This document is the integration boundary between Claude's frontend work and ChatGPT's core/backend work.

## Ownership

- Claude owns UI, components, styling, responsive layouts, cat presentation/animation, accessibility and frontend tests.
- ChatGPT owns domain models, application services, local persistence, timezone/DST logic, timer/countdown engines, alarm scheduling and native adapters.
- No cloud server, accounts, remote database, analytics or sync in MVP. Backend means the local application engine.

## Integration principles

1. Frontend components call typed application services. They do not access IndexedDB, native APIs or timezone scheduling directly.
2. Core services expose typed results and typed errors. Do not silently swallow failures.
3. Persisted state is authoritative. UI state may cache or optimistically represent it, but must reconcile after service responses.
4. Alarm status distinguishes local saved state from OS scheduling state.
5. Native capability and permission state must be visible to the UI.
6. A mock implementation may be used during frontend development, but it must implement the same interface and be replaceable without rewriting components.

## Initial TypeScript contract

The following is the intended public surface. The core owner may refine implementation details while preserving the concepts and notifying the frontend owner of breaking changes.

```ts
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type MissionKind =
  | "math" | "memory" | "sequence" | "typing"
  | "logic" | "checklist" | "movement" | "random";

export type MissionConfig = {
  kind: MissionKind;
  difficulty: "easy" | "medium" | "hard";
  rounds: number;
};

export type Alarm = {
  id: string;
  label: string;
  enabled: boolean;
  hour: number;
  minute: number;
  repeatDays: Weekday[];
  timeZone: string; // IANA identifier, e.g. Europe/London
  soundId: string;
  volume: number;
  gradualVolume: boolean;
  vibration: boolean;
  snoozeMinutes: number;
  mission: MissionConfig | null;
  createdAt: string;
  updatedAt: string;
};

export type AlarmScheduleState =
  | "scheduled"
  | "saved_only"
  | "permission_required"
  | "unsupported"
  | "failed";

export type AlarmWithStatus = {
  alarm: Alarm;
  scheduleState: AlarmScheduleState;
  nextOccurrence: string | null; // ISO instant
  message?: string;
};

export type AlarmCapabilities = {
  platform: "web" | "windows" | "android" | "ios";
  nativeAlarmSupported: boolean;
  exactScheduling: boolean;
  requiresPermission: boolean;
  permissionGranted: boolean;
  notes: string[];
};

export type Countdown = {
  id: string;
  title: string;
  targetInstant: string;
  timeZone: string;
};

export type SavedCity = {
  id: string;
  cityName: string;
  countryCode: string;
  timeZone: string;
};

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

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string; message: string } };

export interface AlarmService {
  list(): Promise<Result<AlarmWithStatus[]>>;
  create(input: Omit<Alarm, "id" | "createdAt" | "updatedAt">): Promise<Result<AlarmWithStatus>>;
  update(id: string, patch: Partial<Omit<Alarm, "id" | "createdAt">>): Promise<Result<AlarmWithStatus>>;
  remove(id: string): Promise<Result<void>>;
  setEnabled(id: string, enabled: boolean): Promise<Result<AlarmWithStatus>>;
  getCapabilities(): Promise<Result<AlarmCapabilities>>;
  requestAlarmPermission(): Promise<Result<AlarmCapabilities>>;
  testAlarm(): Promise<Result<void>>;
}

export interface TimeService {
  now(timeZone?: string): string;
  formatInstant(instant: string, timeZone: string): string;
  previewAlarm(input: {
    hour: number;
    minute: number;
    timeZone: string;
    repeatDays: Weekday[];
  }): Result<{ targetTime: string; deviceTime: string; nextOccurrence: string }>;
}

export interface TimerService {
  start(durationMs: number, label?: string): Promise<Result<{ id: string }>>;
  pause(id: string): Promise<Result<void>>;
  resume(id: string): Promise<Result<void>>;
  cancel(id: string): Promise<Result<void>>;
  list(): Promise<Result<Array<{ id: string; label: string; endsAt: string; paused: boolean }>>>;
}

export interface CountdownService {
  list(): Promise<Result<Countdown[]>>;
  create(input: Omit<Countdown, "id">): Promise<Result<Countdown>>;
  remove(id: string): Promise<Result<void>>;
}

export interface WorldClockService {
  list(): Promise<Result<SavedCity[]>>;
  add(city: Omit<SavedCity, "id">): Promise<Result<SavedCity>>;
  remove(id: string): Promise<Result<void>>;
}

export interface SoundService {
  list(): Promise<Result<SoundItem[]>>;
  setFavourite(id: string, favourite: boolean): Promise<Result<void>>;
  preview(id: string): Promise<Result<void>>;
}
```

## UI expectations

- Show “Saved in UP” separately from “Scheduled with your device.”
- If native scheduling is unavailable, show a clear explanation and do not imply the alarm will ring in the background.
- Permission prompts should be initiated by an explicit user action.
- Timezone alarm editor displays target-city and device-local time together.
- Every service failure should have a user-readable error state.
- UI must not assume that a timer/alarm continues after app closure unless the platform service confirms support.

## Change management

If a service signature or domain type must change, update this document first and tell the other owner what changed. Keep mocks, frontend and core implementations type-compatible.


## Additional core services

The core package also exports:

```ts
export class MissionService {
  create(config: MissionConfig): WakeChallenge;
  check(challengeId: string, response: string): { correct: boolean; message: string };
  completeAction(challengeId: string): { completed: boolean };
}

export type UpSettings = {
  catName: string;
  motivationStyle: "direct" | "warm" | "competitive" | "reflective";
  reducedMotion: boolean;
  wakeReason: string;
};

export class SettingsService {
  get(): Promise<Result<UpSettings>>;
  update(patch: Partial<UpSettings>): Promise<Result<UpSettings>>;
}
```

The sound preview implementation currently synthesises short original tones with the Web Audio API. It does not yet include a large recorded sound library or native audio packaging.

The current `WebAlarmScheduler` is deliberately conservative: it saves alarm data but returns `saved_only`. Native platform adapters must replace it before background alarm support can be claimed. Timer persistence stores deadlines, but background expiration alerts also require native/platform integration.


## Frontend import point

The shared core is exposed through one service container:

```ts
import { upCore } from "./core";

upCore.alarms
upCore.countdowns
upCore.missions
upCore.settings
upCore.sounds
upCore.timers
upCore.worldClock
upCore.backup
upCore.time
```

Use these real local services directly from the frontend integration layer. Keep React components focused on presentation and interaction. The default alarm scheduler is currently a safe web fallback that reports `saved_only`; it must be replaced by native adapters before claiming background alarm reliability.
