# apps/web Agent Style Guide

Scope: This guide applies only to frontend work inside `apps/web`.

## Primary Objective

Build a production-ready Next.js frontend that is design-faithful, scope-aware, and easy to evolve.

## Stack and Defaults

- Framework: Next.js (App Router) + React + TypeScript.
- Styling: CSS Modules for component styles.
- Global styling: shared tokens + typography in global CSS files.
- Do not add Tailwind unless explicitly requested by the user.

## Component Strategy

- Start with component library code inside `apps/web`.
- Keep components extraction-ready for a potential future `packages/ui` move.
- UI components must be presentational and prop-driven.
- Do not put API calls or business logic in UI primitives.

Suggested layout:

```text
apps/web/
  src/
    app/
    components/
      ui/
    features/
    styles/
      tokens.css
      typography.css
```

## Data and Architecture Rules

- Prefer server-side data fetching for reads.
- Use client components only for interactive UI needs.
- Keep API integration in feature/page/server-action layers, not in `components/ui`.
- Match backend API contracts in `apps/api`.

## Design-to-Code Workflow

- Treat Figma as visual source, not scope source.
- For each screen/component, classify:
  - `v1-ready` (build now)
  - `v1-shell` (visual shell only)
  - `deferred` (do not implement yet)
- Preserve visual fidelity for `v1-ready` elements.
- For out-of-scope design elements, keep appearance but disable behavior.
- Accessibility is a very high priority in design implementation, not a later polish pass.
- When translating designs, preserve semantics, keyboard support, focus visibility, screen-reader clarity, and contrast alongside visual fidelity.

## Styling Rules

- Use design tokens (CSS variables) for colors, spacing, radius, shadows, and type scale.
- Avoid hardcoded values repeated across components.
- Keep CSS Module class names semantic (`container`, `title`, `actions`, etc.).
- Ensure responsive behavior for desktop + mobile.
- Do not rely on hover-only cues for critical interaction states.

## Quality Bar

- Build reusable components before page-specific duplication.
- Keep files small and composable.
- Test loading/empty/error states on data-driven screens.
- Keep naming consistent with finance domain (`receipt`, `receipt_item`, etc.).
- Treat semantic HTML, keyboard navigation, `:focus-visible` states, labeling, and color contrast as required quality checks for web components.

## Commands and Environment

- Prefer running app commands via Docker Compose from repo root when possible.
- Do not commit secrets or local-only env files.

## Deliverable Expectations Per Slice

- Implemented UI/feature slice in `apps/web`.
- Minimal docs update when conventions or flows change.
- Clear local run/verify steps included in final notes.
