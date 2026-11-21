# UP — Technical plan

## Recommended architecture

Use a shared TypeScript codebase for the web experience and reusable UI/business logic, with native platform modules for alarm scheduling.

Suggested starting point:
- React + TypeScript + Vite
- Tailwind CSS plus a small, deliberately designed component system
- IndexedDB for local web structured data (Dexie is a reasonable wrapper)
- Native local persistence on mobile as appropriate to the selected framework
- `Intl.DateTimeFormat` and IANA timezone identifiers for display; use a timezone-aware library such as Temporal/polyfill or date-fns-tz for scheduling calculations
- PWA support for installability and offline web use
- Evaluate Capacitor plus custom native plugins for Android/iOS, or another cross-platform shell, only after proving the native alarm APIs are accessible and reliable
- Evaluate Tauri for a Windows desktop package if the chosen native alarm/background implementation is viable

Do not assume that a shared web runtime can provide reliable alarms in the background. Keep native scheduling behind an interface. First inspect the repository and choose the smallest viable architecture; do not blindly scaffold multiple shells before the shared core works.

## Locked product decisions

- Product name: UP
- Pet: original cat companion
- Targets: Windows, Android, iPhone
- Data: local-first, no account/backend/cloud sync in MVP
- Web UI may support setup and foreground features but is not a guaranteed background alarm engine

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

Keep sound metadata, cat state, user preferences and wake history in separate models. Validate all persisted data at the boundary.

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

Each platform implements this contract natively. The UI must display capability and permission state. Include a test-alarm action and a setup checklist. If an integration is not implemented or verified, show it as unsupported/not yet configured rather than simulating success.

## Platform notes

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
- Never claim alarms will ring if the phone is powered off.

**iOS**
- Investigate the current AlarmKit/API availability and requirements for the deployment target.
- Where a true alarm API is unavailable, use supported notification behaviour and label the limitation clearly.
- Test interruption, Focus, silent mode and permission behaviour on physical devices; do not infer guarantees from simulator tests.
- Never claim alarms will ring if the phone is powered off.

## Timezone correctness

- Store an IANA timezone ID for every city-based alarm.
- Store the intended local hour/minute and recurrence rule.
- Convert each upcoming occurrence to an absolute instant at scheduling time.
- Recompute future occurrences after timezone database / DST changes and after device timezone changes.
- Test DST gaps (a local time that does not exist) and overlaps (a local time that occurs twice). Ask the user how to resolve ambiguous/nonexistent times rather than silently guessing.
- Show the target city's wall-clock time and the device's local equivalent in the alarm editor.

## Sound pipeline

Use a catalogue manifest containing id, title, category, duration, source, licence, attribution and asset path. Keep previews short and avoid autoplay. Custom audio imports should be local and validated. Native clients may need platform-specific audio packaging and playback handling. Do not commit copyrighted commercial tracks.

## Cat implementation

Start with a small set of original vector or sprite animations (idle, sleepy, curious, celebrating). Keep cat state in a simple reducer/state machine. Do not pull in an entire game engine for the MVP. If adapting an existing pet asset or code, verify its licence, attribution requirements and redistribution terms before use.

## Suggested repository layout

```text
src/
  app/
  components/
  features/
    alarms/
    sounds/
    missions/
    cat/
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
  android/
  ios/
docs/
  PRODUCT_SPEC.md
  TECHNICAL_PLAN.md
  CLAUDE_BUILD_PROMPT.md
```

The exact workspace layout can change once the framework is selected. Keep platform adapters separate from shared feature logic.

## Build sequence

### Phase 0: repository and architecture audit
- Inspect the repository, existing docs, branches and any code already present.
- Confirm the supported framework and package manager.
- Write down the chosen architecture and its trade-offs before adding a large dependency set.
- Keep the first implementation runnable locally.

### Phase 1: polished shared-core MVP
- Establish the app shell, design tokens, responsive navigation and local persistence.
- Build the Today screen and alarm list/editor with a clearly labelled mock scheduler.
- Build sound browsing/preview with a small original/licensed starter set.
- Build at least one complete mission flow.
- Build the cat's idle and wake-up reactions.
- Add timer, countdown and world clock.
- Add timezone alarm calculations and DST tests.
- Make all core flows work offline after initial load.

### Phase 2: native alarm proof of concept
- Prove Android exact alarm scheduling and permission flow on a physical device.
- Prove iOS AlarmKit or the best currently supported native alarm path on a physical device.
- Prove Windows scheduling behaviour on a real Windows machine.
- Document limitations and permission setup separately for each platform.
- Do not advertise an alarm capability until it has passed the platform test matrix.

### Phase 3: hardening and packaging
- Test reboot, force-close, locked-screen and permission-revocation cases.
- Add export/import backup for local data.
- Add accessibility and reduced-motion checks.
- Package installable builds and document installation.

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
- Local data survives app restart and app update
