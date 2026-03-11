# Use Motion For Sidebar Toggle Animation

Date: 2026-03-11

## Context

The desktop sidebar toggle started as a CSS-only icon rotation inside `apps/web/src/components/sidebar/Sidebar.tsx` and `apps/web/src/components/sidebar/Sidebar.module.css`.
That approach handled a simple flip, but it was too limited for the interaction exploration we wanted:

- curved icon travel during collapse and expand
- coordinated position and rotation changes
- fast iteration on motion feel without rewriting the sidebar repeatedly

The work also included isolated test components next to the sidebar so animation ideas could be tried on the homepage before being applied to the real toggle.

## Decision

Use the `motion` package in `apps/web` for the sidebar toggle icon animation, while keeping the rest of the sidebar expand and collapse behavior in CSS.

Specifically:

- keep sidebar width and label transitions in CSS modules
- use `motion/react` in `Sidebar.tsx` for the toggle icon's position and rotation
- prototype motion behavior in dedicated local test components before integrating it into the real sidebar

## Why

- The toggle animation needs more than a single transform flip.
- Position and rotation are easier to coordinate from one motion value than from stacked CSS transitions.
- Prototyping in isolated components kept the main sidebar implementation from thrashing while the motion was still being explored.
- The dependency footprint is acceptable for the web app given the added interaction flexibility.

## Impact

- `apps/web/package.json` includes `motion` as a frontend dependency.
- `Sidebar.tsx` now contains motion logic for the toggle icon.
- `Sidebar.module.css` no longer owns the toggle icon rotation behavior.
- Future complex sidebar or navigation animations can reuse the same toolchain instead of forcing CSS-only workarounds.