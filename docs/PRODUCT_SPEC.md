# UP — Product specification

## Product promise

UP helps the user wake up, get oriented and start the day. It is an alarm clock first, with a companion and useful time tools around it.

## Locked product decisions

- **Pet:** Miso uses the MIT-licensed PixelPets sprite engine. Use the same pixel sprite and coat everywhere. Never substitute an emoji, SVG illustration, or alternate cat face.
- **Phone targets:** Android and iPhone.
- **Data:** local-first. The MVP requires no account, backend, or cloud sync. Data should remain on the device and be exportable where practical.
- **Desktop:** Windows.
- **Web:** a responsive web experience for setup, preview and supported foreground features. Do not present the web app as a reliable background alarm engine.

## Experience and visual identity

**Chosen direction: atmospheric editorial.** The interface should feel like opening a beautifully designed personal object: calm at night, clear and energising in the morning.

Palette:
- Ink: `#10191B`
- Deep petrol: `#173D43`
- Forest: `#294B3A`
- Burgundy: `#642F3D`
- Warm ochre: `#C49A55`
- Soft ivory: `#F2EFE6`
- Muted text: `#A7B0AA`

Use the palette as a system, not as a set of giant gradients. Typography should pair a distinctive editorial display face with a highly legible UI sans. Use restrained grain/texture, subtle light, strong hierarchy and meaningful transitions. The cat supplies warmth and personality.

## Information architecture

Primary navigation:
- Today
- Alarms
- Sounds
- Timer
- World clock
- Countdown
- Cat
- Settings

On mobile, use a compact bottom navigation for the most-used destinations and place secondary tools in a clear More area.

## Today screen

- Live local time and date
- Next alarm with time remaining
- Quick create alarm action
- Today's intention / personal reason to get up
- First upcoming task or commitment
- Cat idle animation and contextual reaction
- Quick access to timer and countdowns

Avoid turning this into a wall of cards. One clear hero element, then a few useful supporting elements.

## Alarms

Each alarm supports:
- Time, label and enabled state
- Repeat days
- Device-local timezone or selected IANA timezone
- Sound, preview, volume and gradual fade
- Vibration where supported
- Snooze configuration
- Mission type and difficulty
- Optional motivational line / personal voice recording
- Optional briefing before or after dismissal

Timezone flow:
1. Choose a city or timezone.
2. Set the desired wall-clock time in that location.
3. Show the location's current time and the device's corresponding local time.
4. Explain daylight-saving behaviour.
5. Save the IANA timezone identifier and local wall-clock schedule, not a hard-coded offset.

If the target city observes daylight saving, the alarm should follow that city's local clock through seasonal changes. Provide an explicit setting if the user instead wants a fixed instant/offset.

## Sound library

- Large, browsable sound catalogue
- Categories, search, favourites and recently used
- Preview controls with waveform/progress where practical
- Recently played list and explicit stop control
- Per-alarm sound assignment
- Custom file import where supported (local web preview; native alarm playback must clearly report support state)
- Gradual volume increase and optional vibration
- Clear sound attribution/licence metadata
- Never bundle unlicensed commercial recordings

Initial sound categories: Soft starts, Nature, Rain, Water, Birds, Ambient, Instrumental, Pulse, Bright, Classic alarm, Custom.

## Mission system

Mission choices:
- Quick maths
- Memory cards
- Repeat a sequence
- Type a displayed phrase
- Simple logic/pattern puzzle
- Short checklist
- Gentle movement prompt

Settings: enabled/disabled, difficulty, number of rounds and estimated duration. Allow a different mission each day. Basic missions should work offline.

Provide accessible alternatives and an emergency stop. A mission is a wake-up aid, not a safety barrier.

## Cat companion

Miso is a single persistent pixel-art companion rendered by the licensed PixelPets engine. The same sprite, coat, proportions and face must be used everywhere. She remains mounted across navigation, follows the cursor, can be dragged anywhere inside the viewport, and offers consistent pet/treat/butterfly interactions. The editorial interface frames her without replacing her with a second illustration.

Initial behaviour:
- Idle animation on Today
- Reacts when an alarm is created, when the user wakes, and when a mission is completed
- A few moods/expressions (sleepy, curious, content, celebratory)
- Name and a small set of cosmetic choices
- Gentle progression/unlocks

No punishment for missed days, no guilt messages, no forced daily engagement. Keep pet data local initially. Create original artwork or use assets with verified licences.

## Timer

- Multiple timers
- Presets and custom duration
- Start, pause, resume, reset
- Background/native timer notifications where available
- Sound selection
- Clear remaining-time display

## Countdown

- Named event and target date/time
- Optional timezone
- Days/hours/minutes display
- Pin selected countdown to Today

## World clock

- Search and save cities
- Display local time, date and day difference
- Compare several cities at once
- Show timezone abbreviation and UTC offset as informational details
- Use IANA timezone data; never calculate offsets manually

## Motivation and morning briefing

Motivation styles:
- Direct and practical
- Warm and encouraging
- Competitive / challenge-oriented
- Quiet and reflective

Allow the user to write their own reasons, goals and reminders. Avoid generic quote spam. The morning briefing can surface today's schedule and top priorities, but should remain useful even without calendar integrations.

## Patterns

Optional wake-time history and consistency trends. No body metrics, no sleep scoring, no shaming. The user controls whether tracking is enabled.

## Accessibility and safety

- Keyboard navigation and screen-reader labels
- High contrast and scalable text
- Reduced motion
- Adjustable sound and vibration
- Clear emergency alarm stop
- Mission alternatives for mobility, sensory and cognitive needs
- No dark patterns or guilt-based retention

## MVP acceptance criteria

- User can create, edit, disable and delete multiple alarms.
- Each alarm can use a different sound and mission.
- Sound previews work before saving.
- Custom audio can be imported locally, previewed, favourited and removed.
- Timer and countdown remain usable independently of alarms.
- World clock shows correct local times for selected cities.
- Timezone alarm shows both target and device times before save.
- Timezone/DST logic is based on IANA identifiers and has tests.
- Data persists after app restart.
- App clearly distinguishes native alarm capability from notification fallback.
- Cat appears in the experience and reacts to meaningful events.
- Android and iOS builds are treated as separate native alarm integrations, not assumed to behave identically.

## User-supplied UI and motion references

The user previously supplied these design resources. Treat them as inspiration sources, not as a requirement to copy a website wholesale:

**UI/component inspiration**
- [React Bits](https://reactbits.dev/)
- [Kokonut UI](https://kokonutui.com/)
- [Bklit UI](https://bklitui.com/)
- [21st.dev](https://21st.dev/)

**Motion and interaction**
- [Motion](https://motion.dev/)
- [GSAP](https://gsap.com/)
- [Anime.js](https://animejs.com/)
- [React Spring](https://react-spring.dev/)

**Visual references and tools**
- [Motion Sites](https://motionsites.ai/)
- [Manus](https://manus.im/)
- [Coolors](https://coolors.co/)

The user originally described these alongside high-budget drink landing pages and Haoqi-style brutalist/experimental UI. Translate that ambition into UP's own atmospheric editorial language: tactile transitions, crisp type, unusual but usable composition, purposeful motion and strong visual identity. Do not turn UP into a drink landing page, portfolio, or motion-demo gallery. Keep the alarm workflow fast and legible. Use Coolors only as a palette exploration aid; the approved UP palette remains authoritative.
