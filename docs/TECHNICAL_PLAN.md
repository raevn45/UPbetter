# UP — Technical plan

## Team ownership

- **Frontend (Claude):** UI, visual system, responsive layouts, navigation, interaction design, cat visuals/animation, accessibility and frontend tests.
- **Core/backend (ChatGPT):** domain models, application services, local persistence, timezone/DST calculations, timer/countdown logic, alarm scheduler abstraction, native platform integrations and core tests.
- The frontend/backend boundary is documented in `docs/FRONTEND_BACKEND_CONTRACT.md`. Treat that as the shared integration contract.

“Backend” means the local application engine. UP does not need a cloud server, user accounts, remote database, analytics or cloud sync for the MVP.

## Recommended architecture

Use a shared TypeScript codebase for the web experience and reusable UI/business logic, with native platform modules for alarm scheduling.

Suggested starting point:
- React + TypeScript + Vite
- Tailwind CSS plus a small, deliberately designed component system
- IndexedDB for local web structured data (Dexie is a reasonable wrapper)
- Native local persistence on mobile as appropriate to the selected framework
- `Intl.DateTimeFormat` and IANA timezone identifiers for display; use a timezone-aware library such as Temporal/polyfill or date-fns-tz for scheduling calculations
- PWA support for installability and offline web use
- Evaluate Capacitor plus custom native plugins for Android/iOS, or another cross-platform shell, only after proving native alarm APIs are accessible and reliable
- Evaluate Tauri for a Windows desktop package if the chosen native alarm/background implementation is viable

Do not assume a shared web runtime can provide reliable alarms in the background. Keep native scheduling behind an interface. First inspect the repository and choose the smallest viable architecture; do not scaffold multiple shells before the shared core works.

## Locked product decisions

- Product name: UP
- Pet: original cat companion
- Targets: Windows, Android, iPhone
- Data: local-first, no account/cloud sync in MVP
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
```

Keep sound metadata, cat state, user preferences and wake history in separate models. Validate persisted data at boundaries.

## Alarm scheduler boundary

Define a platform-neutral contract. The UI must display capability and permission state. Include a test-alarm action and setup checklist. If an integration is not implemented or verified, show it as unsupported/not yet configured rather than simulating success.

## Platform notes

**Web/PWA**
- Useful for interface, setup, world clock and foreground timers.
- Service workers and notifications are not a substitute for a guaranteed alarm.
- Never promise playback when browser is closed or device suspended.

**Windows**
- Investigate Windows-native scheduling/notification/background options.
- An app cannot ring when the laptop is powered off. Sleep behaviour depends on hardware, OS settings and selected mechanism.
- Test on a real Windows machine.

**Android**
- Implement native alarm scheduling and exact-alarm permission handling where required.
- Handle reboot rescheduling, Doze, battery optimisation and permission revocation.
- Test multiple manufacturers.

**iOS**
- Investigate current AlarmKit/API availability and deployment requirements.
- Where a true alarm API is unavailable, use supported notification behaviour and label the limitation.
- Test on physical devices.

No platform can ring while powered off.

## Timezone correctness

- Store an IANA timezone ID for every city-based alarm.
- Store intended local hour/minute and recurrence rule.
- Convert each upcoming occurrence to an absolute instant at scheduling time.
- Recompute future occurrences after timezone database/DST changes and device timezone changes.
- Test DST gaps and overlaps. Resolve ambiguous/nonexistent times explicitly.
- Show target-city wall-clock time and device-local equivalent in the editor.

## Sound pipeline

Use a catalogue manifest containing id, title, category, duration, source, licence, attribution and asset path. Keep previews short and avoid autoplay. Custom audio imports should be local and validated. Do not commit copyrighted commercial tracks.

## Cat implementation

Create original vector/sprite animation states (idle, sleepy, curious, celebrating). Keep pet state simple and local. No game engine required for MVP.

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
    domain/
    services/
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
  FRONTEND_BACKEND_CONTRACT.md
  CLAUDE_BUILD_PROMPT.md
```

Exact layout may change after repository audit. Keep frontend components separate from core services and native adapters.

## Build sequence

1. Agree types and service interfaces.
2. Build the frontend against those interfaces with isolated mocks.
3. Implement local core services and persistence.
4. Integrate frontend with real local services.
5. Prove Android, iOS and Windows alarm scheduling separately on physical devices.
6. Harden, test and package.

## Non-negotiable tests

- Recurring alarms across daylight-saving transitions
- City timezone differs from device timezone
- Device timezone changes after alarm creation
- Reboot / app update / permission revoked
- Multiple alarms at same time
- Sound unavailable or deleted
- App backgrounded, force-closed and device locked
- Mission interrupted and emergency stop used
- Timer expires while app is backgrounded
- Local data survives app restart and app update
