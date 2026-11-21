# UP

**A wake-up system with a little personality.**

UP is a personal alarm, timer and world-clock app built around one simple idea: getting out of bed should take less negotiation. It combines alarms, wake-up challenges, a tiny cat companion, a sound library and useful time tools in one calm, characterful experience.

## Current development status

The repository now contains the first local-core foundation:
- Typed domain models and frontend/core service contracts
- IndexedDB local persistence
- Alarm CRUD and honest web scheduler capability reporting
- IANA timezone recurrence calculations using Temporal
- Timer, countdown and world-clock services
- Original synthesised sound previews and favourites
- Offline wake-up mission logic
- Local preferences, including the cat's name and motivation style

A first responsive React frontend has now been added and wired to the local core. It is an initial MVP implementation and still needs CI/build verification, browser QA and interaction polish. Native Android/iOS/Windows alarm reliability remains a separate milestone. A saved alarm in the current web runtime is **not** a guaranteed background alarm.

## Development

Requirements: Node.js 20+ and npm.

```bash
npm install
npm test
npm run typecheck
```

The Vite/React application entry point and initial UI are now present:

```bash
npm run dev
npm run build
```

## Team ownership

- **Claude:** frontend only. React screens, responsive UI, styling, cat visuals/animation, accessibility and frontend tests.
- **ChatGPT:** local core/backend. Domain models, persistence, services, timezone/DST calculations, missions, timers and native alarm integrations.
- **Shared integration contract:** [docs/FRONTEND_BACKEND_CONTRACT.md](docs/FRONTEND_BACKEND_CONTRACT.md).

There is no cloud server, account, remote database, analytics or sync in the MVP. “Backend” means the local application engine.

## Product direction

### The feel
Atmospheric editorial design with confident typography, thoughtful motion and a restrained palette:
- Ink: `#10191B`
- Deep petrol: `#173D43`
- Forest: `#294B3A`
- Burgundy: `#642F3D`
- Warm ochre: `#C49A55`
- Soft ivory: `#F2EFE6`

Avoid generic dashboard layouts, purple-blue gradient blobs, excessive glassmorphism and filler motivational quotes. The cat is an original character, not an emoji, and must never shame the user for missing an alarm.

### Core areas
1. Today: next alarm, live clock, daily intention and cat companion.
2. Alarms: multiple schedules, repeat days, labels, sound, fade, vibration, snooze, mission and timezone.
3. Sounds: browse, preview, favourite and custom audio where supported.
4. Missions: maths, memory, sequence, typing, logic and gentle action prompts.
5. Cat: moods, reactions, customisation and gentle progression.
6. Timer: multiple timers, pause/resume and sound.
7. Countdowns: named events and target dates.
8. World clock: saved cities and timezone comparison.
9. Timezone alarms: set a city's wall-clock time and show the device-local equivalent.
10. Morning briefing and optional wake patterns.

## Alarm reliability

- A browser/PWA cannot promise alarm playback after the browser is closed or the device is suspended.
- Windows behaviour during sleep depends on OS and hardware. A powered-off laptop cannot ring.
- Android requires native scheduling, appropriate exact-alarm access, reboot handling and battery-restriction testing.
- iOS requires a supported native alarm path for the chosen deployment target and physical-device testing.
- No phone can ring while powered off.
- Never claim an alarm is guaranteed unless that exact platform/OS path has been tested.

## Privacy

Start local-first. Alarm schedules, routines, sound preferences and cat state work without an account. No cloud sync or analytics in the MVP. Add export/backup before considering optional sync.

## Documentation

- [Product specification](docs/PRODUCT_SPEC.md)
- [Technical plan](docs/TECHNICAL_PLAN.md)
- [Frontend/backend contract](docs/FRONTEND_BACKEND_CONTRACT.md)
- [Claude frontend build prompt](docs/CLAUDE_BUILD_PROMPT.md)
