# UP

**A wake-up system with a little personality.**

UP is a personal alarm, timer and world-clock app built around one simple idea: getting out of bed should take less negotiation. It combines reliable alarms, wake-up challenges, a tiny companion pet, a proper sound library, and useful time tools in one calm, characterful experience.

The product should feel considered and human, not like a generic productivity dashboard.

## Product direction

### The feel

A distinctive, atmospheric interface with editorial typography and a restrained palette:
- Deep ink / near-black as the base
- Petrol blue and forest green as the main colours
- Warm ochre as a small highlight
- Soft ivory for readable contrast

Use texture, light, thoughtful motion and generous spacing. Avoid the default AI-app look: no purple-blue gradient blobs, excessive glassmorphism, dashboard-card overload, or generic motivational quotes.

The little pet is a central character, not a sticker. It should have a home/idle state, react to alarms and completed routines, and gradually develop through consistent care. It must never shame the user for missing an alarm.

### Core areas

1. **Today** — next alarm, live clock, upcoming commitments, daily intention and pet.
2. **Alarms** — multiple alarms, repeat days, labels, sound, volume/fade, vibration, snooze, mission and timezone.
3. **Sounds** — a large browsable library, preview before selection, categories, favourites, custom audio import where supported, and per-alarm sound choice.
4. **Missions** — configurable dismissal challenges: maths, memory, typing, sequence, QR/location-style physical prompts (optional), and a short get-moving routine. Always provide an accessible emergency stop.
5. **Pet** — a small companion with moods, reactions, customisation and gentle progression.
6. **Timer** — multiple timers, presets, pause/resume, and sound selection.
7. **Countdowns** — named countdowns for exams, events, trips and personal dates.
8. **World clock** — save cities/time zones and compare their current times.
9. **Timezone alarms** — create an alarm for a chosen city's local time. Show both the target city's time and the device's equivalent time before saving. Store the IANA timezone (for example, `Europe/London`), not a fixed UTC offset, so daylight-saving changes are handled.
10. **Morning briefing** — today's priorities, schedule and a personal reason to get up.
11. **Patterns** — optional sleep/wake history and streaks, framed gently rather than as a scorecard.
12. **Settings** — appearance, accessibility, sound, notifications, backup/export and privacy.

## Alarm reliability: an explicit product requirement

The website is the place to configure and sync the experience. Installed apps should handle alarms through native operating-system capabilities wherever possible.

- A browser/PWA cannot promise dependable alarm playback after the browser is closed, the device is suspended, or the OS stops background work.
- **Windows:** a desktop app can run while Windows is awake, but no app can make a powered-off laptop ring. Native background/startup behaviour and sleep-state limitations must be explained clearly.
- **Android:** use native scheduled alarms with the appropriate exact-alarm capability/permission and boot rescheduling. Test Doze, battery optimisation and reboot behaviour.
- **iOS:** investigate Apple's current native alarm APIs (including AlarmKit where available on the deployment target) and use the supported native route. If a target OS version cannot provide a true alarm, clearly label the fallback as a notification, not a guaranteed alarm.
- Never tell the user an alarm is guaranteed unless that exact platform/OS path has been tested.
- Request permissions in context and provide an alarm test/setup checklist.

The intended product is a shared web experience plus installable native clients, not a PWA pretending it can do everything.

## Cross-platform plan

- **Web:** responsive website/PWA for setup, dashboard and tools.
- **Windows:** packaged desktop client with native scheduling/background integration.
- **Phone:** native Android and iOS clients or a shared UI with native alarm modules.
- **Shared core:** common data model, timezone logic, challenge definitions, pet state and design system.

A practical implementation can share most UI and business logic, but alarm scheduling must be implemented and tested per operating system. Do not make the alarm depend on a JavaScript timer running in a background web page.

## Sound library

The sound picker should feel like a real part of the product:
- Categories such as gentle, nature, ambient, instrumental, rhythmic, bright and custom.
- Search, favourites, preview and a clear selected state.
- Per-alarm sound, optional gradual volume increase, configurable duration and vibration where supported.
- Let users add their own audio files where the platform allows it.
- Respect licensing. Use original, public-domain or properly licensed audio; keep attribution/licence details with bundled sounds.
- Avoid shipping copyrighted commercial songs without permission.

## Wake-up mission principles

Missions should wake the brain and help the user transition into the day, not punish them.
- Adjustable difficulty and duration.
- A mix of mental and movement prompts.
- Maths questions should be configurable by topic/difficulty and should not require internet access for basic generation.
- A movement prompt must be gentle and optional; include alternatives for accessibility.
- A clearly available emergency stop / accessibility override.
- Never use shame, threats, or streak-loss pressure.

## Pet principles

The pet should be charming, expressive and original.
- Reactions to alarm set, wake-up, mission completion, rest and customisation.
- Gentle progression through interaction, not punitive streak mechanics.
- No manipulative notifications or guilt for absence.
- Prefer original artwork or assets with a compatible licence. Record sources and licences before reusing assets or code from another repository.

## Privacy

Start local-first. Alarm schedules, routines, sound preferences and pet state should work without an account. If sync is added later, make it opt-in, explain what is synced, and provide export/delete controls. Do not collect location or microphone data unless a feature explicitly needs it and the user opts in.

## Build priorities

### First usable release
- Distinctive responsive interface
- Create/edit/delete alarms
- Sound library with previews and favourites
- Wake-up mission flow
- Pet companion in the main experience
- Timer, countdown and world clock
- Timezone-aware alarm creation
- Local persistence
- Clear platform capability and permission states

### Reliability release
- Native Windows alarm scheduling
- Native Android alarm scheduling
- Native iOS alarm integration where supported
- Reboot/startup behaviour and permission recovery
- End-to-end tests on real devices

### Later
- Cloud sync
- More pet customisation and animations
- User-recorded motivational messages
- Morning briefing integrations
- Optional sleep/wake insights

## Development principles

- Build the real product, not a static mockup.
- Make the primary alarm flow fast and obvious.
- Keep motion purposeful and respect reduced-motion settings.
- Design for keyboard, touch, screen readers and high contrast.
- Keep platform-specific alarm code isolated behind a shared alarm-scheduler interface.
- Include tests for timezone/DST edge cases.
- Document every platform limitation honestly.

See [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) and [docs/TECHNICAL_PLAN.md](docs/TECHNICAL_PLAN.md).
