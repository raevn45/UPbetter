# UP

**A wake-up system with a little personality.**

UP is a personal alarm, timer and world-clock app built around one simple idea: getting out of bed should take less negotiation. It combines alarms, wake-up challenges, a tiny cat companion, a sound library and useful time tools in one calm, characterful experience.

## Current development status

The local-first React/Vite app is connected to the typed core and IndexedDB storage. The native bridge is now wired into the Capacitor service container.

- **Android:** AlarmManager exact scheduling, permission checks, boot/time-change recovery, full-screen alarm notification, selected CC0 sound playback, snooze, and native wake-challenge flow. The native build workflow generates a debug APK.
- **iOS:** AlarmKit bridge for iOS 26+, one-time alarms and weekly recurrence when the alarm timezone matches the iPhone's current timezone. The build workflow generates an unsigned simulator build.
- **Sounds:** 22 CC0 1.0 soundscapes, including seven recorded field sounds and 15 original designed ambiences, with creator credits. Custom audio can be imported and previewed locally on the web; the Android APK bundles the curated CC0 library.
- **Miso:** one persistent PixelPets pixel cat across every page, draggable anywhere in the viewport, with cursor tracking, pet/treat/butterfly controls, coat changes and contextual reactions.
- **Web:** Vercel PWA remains a preview and cannot guarantee background ringing after the browser is closed or the device is suspended.

Native builds are not the same as device verification. Physical Android and iPhone tests are still required before treating UP as a dependable wake-up alarm. iOS currently uses the system alarm sound and does not yet run the custom mission challenge in the system alarm UI. Windows still uses the installed web app; a native Windows installer is not built.

## Deploy the web app to Vercel

1. Import `raevn45/UPbetter` in Vercel.
2. Keep the project root as `.`. The checked-in `vercel.json` sets the Vite build command (`npm run build`) and output folder (`dist`).
3. The core local-first app works without cloud credentials. To enable the conversational Gemini endpoint, add `GEMINI_API_KEY` in Vercel Project Settings → Environment Variables. Never put this key in frontend code or commit it to Git.
4. Deploy. Vercel serves the website over HTTPS; the web app can be installed from a supported browser and has an offline app-shell cache.

**Important:** web data is stored in that browser/device's IndexedDB. It does not automatically sync between your laptop and phone. A web alarm is not a reliable background alarm after the browser is closed or the device is suspended.

## Native build downloads

Every push to `main` runs [Native app builds](https://github.com/raevn45/UPbetter/actions/workflows/native-build.yml).

- **Android:** download the `UP-android-debug-apk` artifact from a successful run. It is a debug APK for testing, not a Play Store release.
- **iOS:** download `UP-ios-simulator-build` for simulator QA. This is not an installable signed iPhone IPA. An Apple signing setup and a physical-device build are still needed for distribution.

The Android workflow generates the Capacitor project, registers the UP plugin, merges alarm receivers and permissions, downloads the CC0 recordings, converts them to compact MP3 assets, and builds the APK. The iOS workflow generates the Capacitor project and registers the AlarmKit plugin.

For local native development, follow [native bridge build and test notes](native/capacitor/README.md).

## Development

Requirements: **Node.js 22 LTS**, npm, Git, and Visual Studio Code.

### Get the code

```bash
git clone https://github.com/raevn45/UPbetter.git
cd UPbetter
npm install
```

Open the project folder in VS Code:

```bash
code .
```

If the `code` command is not available, open VS Code and choose **File → Open Folder…**, then select the `UPbetter` folder.

### Run and check the app

```bash
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). Changes to React and CSS files refresh in the browser as you save them.

Before committing changes, run:

```bash
npm test
npm run typecheck
npm run build
```

`npm run dev` starts the Vite frontend. The `/api/assistant/chat` serverless endpoint is provided by Vercel, so to test that endpoint locally use the Vercel CLI (`npx vercel dev`) and configure `GEMINI_API_KEY` in the local Vercel environment. Alarm creation, deletion and time-to-next-alarm commands are handled locally by the app.

## Team ownership

- **Claude:** frontend only. React screens, responsive UI, styling, cat visuals/animation, accessibility and frontend tests.
- **ChatGPT:** local core/backend. Domain models, persistence, services, timezone/DST calculations, missions, timers and native alarm integrations.
- **Shared integration contract:** [docs/FRONTEND_BACKEND_CONTRACT.md](docs/FRONTEND_BACKEND_CONTRACT.md).

UP has no remote database, analytics or cross-device sync in the MVP. One optional Vercel serverless function proxies conversational requests to Gemini when `GEMINI_API_KEY` is configured. Alarm data and preferences remain local to each device.

## Product direction

### The feel
Haoqi-inspired editorial design: warm paper, deep black typography, a restrained vermilion accent, serif-led display type, quiet mono metadata, measured whitespace and purposeful motion:
- Warm paper: `#F4F1E8`
- Deep ink: `#191916`
- Oxidised vermilion: `#C45B42`
- Muted sage: `#879080`
- Pale stone: `#E7E2D7`

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
