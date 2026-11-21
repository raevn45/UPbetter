# Working on UP

Read `README.md`, `docs/PRODUCT_SPEC.md` and `docs/TECHNICAL_PLAN.md` before making changes.

## Product and design rules

- This is a real personal alarm app, not a generic productivity dashboard.
- Preserve the chosen atmospheric editorial direction and palette in the product spec.
- Avoid generic AI-generated SaaS aesthetics: no giant gradient blobs, random glass cards, excessive rounded rectangles, stock dashboard layouts or filler copy.
- Use natural, specific microcopy. Keep the interface warm, direct and a little playful.
- The pet is an original companion with subtle expressive animation, not a random emoji pasted into the UI.
- Motion must have purpose and respect reduced-motion preferences.
- Design mobile-first, but make the Windows experience feel intentional too.

## Engineering rules

- Read the existing code before editing. Do not replace working code just to impose a preferred stack.
- Keep components focused and typed. Avoid giant single-file components.
- Keep domain logic separate from UI.
- Use IANA timezone identifiers for world clocks and timezone alarms. Add DST tests.
- Never implement a supposedly reliable alarm using only setTimeout, a browser tab, a service worker or a web notification.
- Isolate native scheduling behind a platform adapter. Be honest in the UI about each platform's actual capability.
- Build an accessible emergency stop for alarm missions.
- Store user data locally first; do not add accounts or analytics without explicit product need.
- Verify asset and code licences before copying from other repositories.
- Add tests for important logic and run the relevant checks after changes.
- Do not claim that a feature works on a platform until it has been tested there.

## Working style

Implement in small, coherent steps. Before adding dependencies, explain why they are needed. Prefer a complete working vertical slice over a large collection of decorative placeholders. Keep README and docs aligned with the implementation.
