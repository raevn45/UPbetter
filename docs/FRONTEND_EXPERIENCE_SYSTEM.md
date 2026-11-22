# UP — Editorial Experience System

## Product feeling
UP is a personal time studio, not a dashboard template. It should feel calm, tactile, quietly confident, and alive. The interface is an editorial object: a warm paper field, precise black typography, purposeful whitespace, and a few moments of cinematic interaction.

## Visual hierarchy
- Base: warm paper `#F4F1E8`; primary ink `#191916`; secondary ink `#65645D`.
- Accent: oxidised vermilion `#C45B42`; use sparingly for active states and important actions.
- Supporting tones: muted sage `#879080`, pale stone `#E7E2D7`, rule `rgba(25,25,22,.16)`.
- Display typography: expressive editorial serif for large moments; clean sans for controls and body; mono only for time, metadata, and system status.
- Avoid default Inter/Roboto stacks, purple-pink gradients, sparkle decoration, glass cards everywhere, generic feature grids, fake metrics, and excessive rounded containers.
- Corners are mostly square or softly cut. Borders are thin and intentional. Shadows are rare and directional.

## Layout
- Desktop: fixed editorial masthead, compact horizontal navigation, wide content canvas with asymmetric compositions.
- Mobile/native: compact masthead, bottom navigation, full-width content, touch targets at least 44px.
- Every screen has its own composition. Today is a live editorial cover; Alarms is a precise list; Sounds is a listening library; Timer is a focused instrument; World is a time atlas; Miso remains a small living companion.
- Never sacrifice clarity or access to primary alarm controls for decoration.

## Motion system
- One shared pointer/scroll signal feeds DOM effects. CSS variables `--pointer-x`, `--pointer-y`, and `--scroll-velocity` are updated outside React render state.
- Reveal transitions are short and restrained. Respect `prefers-reduced-motion` and UP's Reduce Motion setting.
- Dot-matrix masking is reserved for menu/transition moments, not repeated on every control.
- Scramble decoding is reserved for short editorial labels and must settle immediately for reduced motion.
- Image negative-to-positive development lasts 800ms and triggers once when entering the viewport.
- Velocity distortion is progressive enhancement only. It must not interfere with scrolling, readability, or low-power devices.
- WebGL is lazy-loaded, has a static fallback, and is disabled for reduced-motion / constrained devices. The glass treatment belongs to one intentional centerpiece, not every surface.

## Interaction principles
- Every control has a visible state, focus state, disabled state, and accessible name.
- Destructive voice commands require explicit confirmation. Never delete or create an alarm based on an ambiguous transcript.
- Permission prompts happen in context after a clear user action. Explain the reason before requesting. Show granted, denied, and not-yet-requested states.
- Signed-in Google identity replaces the sign-in call to action with the account identity. Account controls remain available under Accounts.
- Install affordances appear only in a browser context where installation is possible, never inside the installed/native app.

## Product rules
- Preserve alarm, timer, countdown, world-clock, sound, backup, productivity, calendar, and Miso behaviour while redesigning.
- Do not reintroduce voice cloning, own-voice modulation, or development-only controls.
- Keep “Leave a message to yourself” as a user-facing feature.
- Voice assistant supports checking the next alarm, creating alarms, and deleting a specifically identified alarm with confirmation. Speech recognition is foreground-only unless a native implementation is explicitly built and tested.
- A permission being declared in a manifest is not proof it has been granted or that the feature works on a real device.

## Quality gate
1. Typecheck and unit tests pass.
2. Production build passes.
3. Desktop and narrow mobile layouts are checked.
4. Reduced motion, keyboard focus, and permission-denied states are checked.
5. Google signed-in, signed-out, expired-session, and account-switch states are checked.
6. Voice create/delete/check commands are tested, including ambiguous and malformed transcripts.
7. Android and iOS permission flows are tested on real devices before claiming native voice support.
