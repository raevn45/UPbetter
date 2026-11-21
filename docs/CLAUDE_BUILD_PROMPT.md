# Claude build brief for UP

Paste this brief into Claude Code after opening the `raevn45/alarm` repository.

---

You are the lead engineer building **UP**, a polished, local-first alarm clock application for Windows, Android and iPhone. Start by inspecting the repository. Read `README.md`, `CLAUDE.md`, `docs/PRODUCT_SPEC.md` and `docs/TECHNICAL_PLAN.md` completely before coding.

## Your first task

Do not jump straight into a landing page or generate a huge pile of placeholder screens. First:
1. Audit the repository and report the current state.
2. Recommend the smallest sensible architecture for a shared TypeScript app plus native alarm integrations. Explain trade-offs, especially how Android, iOS and Windows will schedule alarms.
3. Identify which capabilities can be implemented in the shared UI and which require native code.
4. Create a short implementation checklist.
5. Then begin Phase 1 below unless a genuinely blocking architectural decision requires clarification. Make sensible defaults rather than asking me to approve every small detail.

## Locked decisions

- App name: UP.
- Companion: an original cat character.
- Platforms: Windows, Android and iPhone.
- Data: local-first, no account, backend or cloud sync in the MVP.
- Visual direction: atmospheric editorial. Use the palette and detailed guidance in `docs/PRODUCT_SPEC.md`.
- The user wants a visually excellent product, but reliability and real functionality outrank decorative polish.

## Phase 1: build a complete shared-core vertical slice

Implement a runnable, responsive app with:
- A polished Today/home screen with current local time, next alarm, a clear create-alarm action and the cat companion.
- Alarm list and create/edit flow: time, label, repeat days, enabled state, sound, snooze and optional wake-up mission.
- Local persistence that survives reloads/restarts.
- Sound library with categories, search, favourites and working previews using original or properly licensed starter sounds.
- At least two complete wake-up mission types, with difficulty/round settings and an accessible emergency stop.
- Cat idle, sleepy and celebratory states, with original simple artwork/animation.
- A working timer.
- A countdown creator and display.
- A world clock with searchable/savable cities.
- Timezone-aware alarm editor: select a city, set its wall-clock time, and display both the target-city time and the device-local equivalent.
- Sensible empty states, loading states, validation, keyboard support and reduced-motion handling.

Every visible control must do something real. If a feature is not implemented yet, label it as coming later or omit the control. Do not ship dead buttons.

## Alarm reliability rules

A web-only timer or notification is not a reliable alarm after the app is closed or the device is suspended. Never pretend otherwise.

Create a platform-neutral scheduler interface and honest capability states. Implement native scheduling only where the actual platform APIs are available and can be tested. Android must account for exact-alarm permission, reboot rescheduling and battery restrictions. iOS must use the currently supported native alarm API where available and handle authorization. Windows must clearly communicate sleep/standby limitations. None of these platforms can ring when the device is powered off.

Do not mark a native alarm as successfully scheduled merely because it was saved to local storage. The UI must distinguish “saved in UP” from “scheduled with the operating system.” Provide a test-alarm/setup flow and clear permission guidance.

## Timezone correctness

Use IANA timezone identifiers, never manually stored UTC offsets. A recurring 7:00 AM London alarm means 7:00 AM in London through the year, including daylight-saving changes. Recalculate upcoming absolute alarm instants from the target zone and recurrence. Handle nonexistent and repeated local times during DST transitions explicitly. Add automated tests.

## Design direction

Do not make this look like a template dashboard. Use confident typography, deliberate spacing, strong visual hierarchy, atmospheric but restrained colour, subtle texture and purposeful motion. Palette: ink `#10191B`, deep petrol `#173D43`, forest `#294B3A`, burgundy `#642F3D`, warm ochre `#C49A55`, soft ivory `#F2EFE6`, muted text `#A7B0AA`. Keep the interface legible and accessible. Make the cat a designed character with a recognisable silhouette and expressive states, not an emoji.

## Data and privacy

Persist data locally. Do not introduce sign-in, telemetry, third-party analytics, remote databases or cloud sync. Keep user-created labels, motivations, recordings and pet preferences on-device. Add a local export/backup path when practical.

## Engineering expectations

- Use TypeScript and strict types.
- Keep UI, domain logic, persistence and native scheduling separate.
- Add tests for timezone calculations, alarm recurrence and important state transitions.
- Use only assets with verified licences or create original assets.
- Avoid unnecessary dependencies.
- Run lint, typecheck, tests and production build. Fix failures before reporting completion.
- Keep the README and technical docs updated.
- Do not say a platform feature works unless it has been tested on that platform.

## Completion report

At the end, report:
1. What was implemented.
2. Exact commands to run it locally.
3. Which features are fully working.
4. Which alarm behaviours are mocked or still unverified.
5. What needs a physical Android, iPhone or Windows device to test.
6. The next smallest milestone.

Start with the repository audit, then build the app. Do not stop after writing a plan or generating a static mockup.
