# UP — Technical plan

## Recommended architecture

Use a shared TypeScript codebase for the web experience and reusable UI/business logic, with native platform modules for alarm scheduling.

Suggested starting point:
- React + TypeScript + Vite
- Tailwind CSS plus a small, deliberately designed component system
- IndexedDB for local structured data (Dexie is a reasonable wrapper)
- `Intl.DateTimeFormat` and IANA timezone identifiers for display; use a timezone-aware library such as Temporal/polyfill or date-fns-tz for scheduling calculations
- PWA support for installability and offline web use
- Capacitor for mobile packaging only if its native plugin path meets the alarm requirements
- Tauri for a Windows desktop package if the chosen native alarm/background implementation is viable

Do not assume that a shared web runtime can provide reliable alarms in the background. Keep native scheduling behind an interface.

## Core domain types

```ts
type Alarm = {
  id: string;
  label: string;
  enabled: boolean;
  hour: number;
  minute: number;
  repeatDays: number[]; // 0-6, document the convention
  timeZone: string; // IANA, e.g. Asia/Dubai
  soundId: string;
  volume: number;
  gradualVolume: boolean;
  vibration: boolean;
  snoozeMinutes: number;
  mission: MissionConfig | null;
  createdAt: string;
};

type MissionConfig = {
  kind: "math" | "memory" | "sequence" | "typing" | "logic" | "checklist" | "movement" | "random";
  difficulty: "easy" | "medium" | "hard";
  rounds: number;
};

type Countdown = {
  id: string;
  title: string;
  targetInstant: string;
  timeZone: string;
};

type SavedCity = {
  id: string;
  cityName: string;
  countryCode: string;
  timeZone: string;
};
```

Keep sound metadata, pet state, user preferences and wake history in separate models. Validate all persisted data at the boundary.

## Alarm scheduler boundary

Define a platform-neutral contract, for example:

```ts
interface AlarmScheduler {
  schedule(alarm: Alarm): Promise<ScheduleResult>;
  cancel(alarmId: string): Promise<void>;
  cancelAll(): Promise<void>;
  getCapabilities(): Promise<AlarmCapabilities>;
  requestPermissions(): Promise<PermissionResult>;
}
```

Each platform implements this contract natively. The UI must display capability and permission state. Include a test-alarm action and a setup checklist.

### Platform notes

**Web/PWA**
- Useful for the interface, setup, world clock and foreground timers.
- Service workers and notifications are not a substitute for a guaranteed alarm.
- Never promise playback when the browser is closed or the device is suspended.

**Windows**
- Package a desktop app and investigate Windows-native scheduling/notification/background options.
- An app cannot ring when the laptop is powered off. Behaviour during sleep depends on hardware, OS settings and the selected native mechanism.
- Provide a clear startup/background setting and test on a real Windows machine.

**Android**
- Implement native alarm scheduling and exact-alarm permission handling where required.
- Handle reboot rescheduling, Doze, battery optimisation and permission revocation.
- Test on multiple manufacturers because background restrictions differ.

**iOS**
- Investigate the current AlarmKit/API availability and requirements for the deployment target.
- Where a true alarm API is unavailable, use supported notification behaviour and label the limitation clearly.
- Test interruption, Focus, silent mode and permission behaviour on physical devices; do not infer guarantees from simulator tests.

## Timezone correctness

- Store an IANA timezone ID for every city-based alarm.
- Store the intended local hour/minute and recurrence rule.
- Convert each upcoming occurrence to an absolute instant at scheduling time.
- Recompute future occurrences after timezone database / DST changes and after device timezone changes.
- Test DST gaps (a local time that does not exist) and overlaps (a local time that occurs twice). Ask the user how to resolve ambiguous/nonexistent times rather than silently guessing.
- Show the target city's wall-clock time and the device's local equivalent in the alarm editor.

## Sound pipeline

Use a catalogue manifest containing id, title, category, duration, source, licence, attribution and asset path. Keep previews short and avoid autoplay. Custom audio imports should be local and validated. Native clients may need platform-specific audio packaging and playback handling.

## Pet implementation

Start with a small set of original vector or sprite animations (idle, curious, sleepy, celebrating). Keep pet state in a simple reducer/state machine. Do not pull in an entire game engine for the MVP. If adapting an existing pet asset or code, verify its licence, attribution requirements and redistribution terms before use.

## Suggested repository layout

```text
src/
  app/
  components/
  features/
    alarms/
    sounds/
    missions/
    pet/
    timer/
    countdown/
    world-clock/
    briefing/
    settings/
  core/
    time/
    storage/
    alarm-scheduler/
    notifications/
  styles/
  assets/
  tests/
apps/
  windows/
  mobile/
docs/
  PRODUCT_SPEC.md
  TECHNICAL_PLAN.md
```

The exact workspace layout can change once the framework is selected. Keep platform adapters separate from shared feature logic.

## Build sequence

1. Establish the app shell, design tokens, navigation and local persistence.
2. Build the alarm editor and alarm list with a mock scheduler.
3. Build sound browsing/preview and mission flows.
4. Add pet states and Today screen.
5. Add timer, countdown and world clock.
6. Add timezone alarm calculations and DST tests.
7. Implement native Windows and mobile scheduler adapters.
8. Test on physical devices, document permissions and package installers.

## Non-negotiable tests

- Recurring alarms across daylight-saving transitions
- City timezone differs from device timezone
- Device timezone changes after alarm creation
- Reboot / app update / permission revoked
- Multiple alarms at the same time
- Sound unavailable or deleted
- App backgrounded, force-closed and device locked
- Mission interrupted and emergency stop used
- Timer expires while app is backgrounded
