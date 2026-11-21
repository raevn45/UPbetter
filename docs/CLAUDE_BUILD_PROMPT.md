# Claude frontend brief for UP

You are responsible for the **frontend only** of UP. ChatGPT is implementing the application core/backend, local persistence, timezone engine and alarm scheduling integrations. Your job is to create an excellent, responsive and fully interactive user experience that integrates with the agreed typed contract.

Read `README.md`, `CLAUDE.md`, `docs/PRODUCT_SPEC.md`, `docs/TECHNICAL_PLAN.md` and `docs/FRONTEND_BACKEND_CONTRACT.md` before coding.

## First: inspect, don't reinvent

1. Audit the repository and report the current frontend state.
2. Identify the existing framework and package manager. Do not replace them without a compelling reason.
3. Read the frontend/backend contract and use its types and interfaces.
4. If the contract needs a frontend-specific extension, propose it rather than silently changing core behaviour.
5. Then implement the frontend in small, runnable increments. Do not stop after a plan or static mockup.

## Ownership boundary

You own:
- React/UI components, page layouts, navigation and responsive design.
- Visual system, typography, icons, transitions and reduced-motion behaviour.
- Cat character's visual design and frontend animation states.
- Forms, validation presentation, empty/loading/error states.
- Accessible user interactions and frontend tests.

ChatGPT owns:
- Domain models and business rules.
- Local database/storage implementation and migrations.
- Alarm recurrence, IANA timezone and DST calculations.
- Alarm scheduler interface and platform-specific native implementations.
- Timer/countdown core logic and persistent state.
- Backend/core tests and integration contracts.

Do not implement a second competing backend. Do not create a cloud API, login, remote database, analytics or sync. The app is local-first.

## Locked product decisions

- App name: UP.
- Companion: original cat character.
- Targets: Windows, Android and iPhone.
- Data: local-first.
- Visual direction: atmospheric editorial. Use the palette and guidance in `docs/PRODUCT_SPEC.md`.
- Reliability and real functionality outrank decorative polish.

## Frontend scope

Build a runnable, polished app with:
- Today screen: local time, next alarm, create-alarm action, personal intention and cat companion.
- Alarm list and create/edit screens, using the agreed core interfaces.
- Sound browser with categories, search, favourites and preview controls.
- Mission selection and active mission screens, including an accessible emergency stop.
- Timer and countdown screens.
- World clock and timezone alarm editor.
- Settings and platform alarm-permission/capability explanations.
- Thoughtful responsive layouts for phone and desktop.
- Clear states when native scheduling is not available or has not yet been integrated.

Every visible control must do something. If a backend method is not yet available, use a clearly isolated mock adapter for visual development and label the limitation. Never fake a confirmed native alarm schedule.

## Design direction

Do not make this look like a template dashboard. Use confident typography, deliberate spacing, strong hierarchy, atmospheric but restrained colour, subtle texture and purposeful motion. Palette: ink `#10191B`, deep petrol `#173D43`, forest `#294B3A`, burgundy `#642F3D`, warm ochre `#C49A55`, soft ivory `#F2EFE6`, muted text `#A7B0AA`. The cat should have a recognisable silhouette and expressive states, not be an emoji.

## Engineering expectations

- TypeScript with strict types.
- Use `docs/FRONTEND_BACKEND_CONTRACT.md` as the source of truth for integration.
- Keep UI components separate from domain logic.
- Do not put alarm recurrence, DST or persistent storage logic inside components.
- Add frontend tests for important interactions and accessibility.
- Use original or properly licensed assets.
- Avoid unnecessary dependencies.
- Run lint, typecheck, tests and production build.
- Keep README and frontend docs aligned with actual implementation.

## Completion report

Report:
1. Screens and interactions implemented.
2. Exact commands to run the frontend.
3. Which services are connected to real core interfaces.
4. Which services still use mocks.
5. Any contract changes needed from the core/backend owner.
6. Frontend tests and build results.

Start by inspecting the repository, then build the frontend. Do not build the backend and do not stop after creating a static mockup.
