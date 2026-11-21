# Working on UP

Read `README.md`, `docs/PRODUCT_SPEC.md`, `docs/TECHNICAL_PLAN.md` and `docs/FRONTEND_BACKEND_CONTRACT.md` before making changes. Follow `docs/CLAUDE_BUILD_PROMPT.md`.

## Team split: non-negotiable

- **Claude owns the frontend only:** visual design, React UI, layout, responsive behaviour, interactions, animation, cat presentation, accessibility and frontend tests.
- **ChatGPT owns the backend/core implementation:** domain models, business logic, local persistence, timezone calculations, alarm scheduling abstractions/native integrations, timer/countdown engines, and backend/core tests.
- Do not independently invent or replace backend contracts. Implement the frontend against `docs/FRONTEND_BACKEND_CONTRACT.md` and coordinate any needed changes through that contract.
- Do not create a cloud server, account system, remote database, analytics or cloud sync. “Backend” here means the local application engine and platform adapters.
- Use typed mock adapters only when necessary to let the frontend run before the real core is integrated. Keep mocks clearly isolated and easy to replace.
- Do not overwrite backend-owned files or make broad architecture changes without coordinating.

## Product decisions

- Product name: UP.
- The companion is an original cat character.
- Targets: Windows, Android and iPhone.
- Data is local-first.
- The web experience is useful for setup and foreground features, but is not a guaranteed background alarm engine.

## Product and design rules

- This is a real personal alarm app, not a generic productivity dashboard.
- Preserve the atmospheric editorial direction and palette in the product spec: ink, petrol, forest, burgundy, ochre and soft ivory.
- Avoid generic AI-generated SaaS aesthetics: no giant gradient blobs, random glass cards, excessive rounded rectangles, stock dashboard layouts or filler copy.
- Use natural, specific microcopy. Keep the interface warm, direct and a little playful.
- The cat is an original companion with subtle expressive animation, not a random emoji pasted into the UI.
- Motion must have purpose and respect reduced-motion preferences.
- Design mobile-first, but make the Windows experience feel intentional too.
- Prioritise complete, usable screens over decorative placeholders.

## Frontend engineering rules

- Read the existing code before editing. Do not replace working code just to impose a preferred stack.
- Keep components focused and typed. Avoid giant single-file components.
- Use the shared types and interfaces in the frontend/backend contract.
- Keep UI state separate from persisted domain state.
- Every visible control must work, or be clearly marked as unavailable/not yet implemented.
- Use accessible labels, keyboard navigation, high contrast and reduced-motion support.
- Do not implement alarm scheduling, timezone recurrence or persistence independently in UI components.
- Do not use setTimeout, a browser tab, a service worker or a web notification as a supposedly reliable background alarm.
- Never claim an alarm can ring while a device is powered off.
- Use only original or properly licensed assets.

## Working style

Implement in small, coherent steps. Explain dependency additions briefly. Run frontend lint, typecheck, tests and production build. Keep the frontend compatible with the agreed contract and report which integrations are mocked pending the core implementation.

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
