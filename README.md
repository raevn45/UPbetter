# UP

**A wake-up system with a little personality.**

UP is a personal alarm, timer and world-clock app built around one simple idea: getting out of bed should take less negotiation. It combines alarms, wake-up challenges, a tiny cat companion, a sound library and useful time tools in one calm, characterful experience.

## Current development status

The local-first React/Vite app is connected to the typed core and IndexedDB storage. The native bridge is now wired into the Capacitor service container.

- **Android:** AlarmManager exact scheduling, permission checks, boot/time-change recovery, full-screen alarm notification, selected CC0 sound playback, snooze, and native wake-challenge flow. The native build workflow generates a debug APK.
- **iOS:** AlarmKit bridge for iOS 26+, one-time alarms and weekly recurrence when the alarm timezone matches the iPhone's current timezone. The build workflow generates an unsigned simulator build.
- **Sounds:** seven real ambient recordings from a CC0 1.0 library, with creator credits. Android build assets are compressed and bundled for offline alarm playback.
- **Miso:** animated, cursor-reactive, draggable pixel cat based on the MIT-licensed PixelPets renderer, with pet/treat/butterfly interactions.
- **Web:** Vercel PWA remains a preview and cannot guarantee background ringing after the browser is closed or the device is suspended.

Native builds are not the same as device verification. Physical Android and iPhone tests are still required before treating UP as a dependable wake-up alarm. iOS currently uses the system alarm sound and does not yet run the custom mission challenge in the system alarm UI. Windows still uses the installed web app; a native Windows installer is not built.

## Deploy the web app to Vercel

1. Import `raevn45/alarm` in Vercel.
2. Keep the project root as `.`. The checked-in `vercel.json` sets the Vite build command (`npm run build`) and output folder (`dist`).
3. No environment variables or separate backend deployment are required for the current local-first MVP.
4. Deploy. Vercel serves the website over HTTPS; the web app can be installed from a supported browser and has an offline app-shell cache.

**Important:** web data is stored in that browser/device's IndexedDB. It does not automatically sync between your laptop and phone. A web alarm is not a reliable background alarm after the browser is closed or the device is suspended.

## Native build downloads

Every push to `main` runs [Native app builds](https://github.com/raevn45/alarm/actions/workflows/native-build.yml).

- **Android:** download the `UP-android-debug-apk` artifact from a successful run. It is a debug APK for testing, not a Play Store release.
- **iOS:** download `UP-ios-simulator-build` for simulator QA. This is not an installable signed iPhone IPA. An Apple signing setup and a physical-device build are still needed for distribution.

The Android workflow generates the Capacitor project, registers the UP plugin, merges alarm receivers and permissions, downloads the CC0 recordings, converts them to compact MP3 assets, and builds the APK. The iOS workflow generates the Capacitor project and registers the AlarmKit plugin.

For local native development, follow [native bridge build and test notes](native/capacitor/README.md).

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
