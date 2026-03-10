# Milestone 2 Notes (Next.js UI Foundation)

Date: 2026-03-10

## What we built

- Replaced the default Next.js global starter styles in `apps/web/src/app/globals.css` with Figma-aligned design tokens.
- Added shared color tokens for the app palette, including neutrals, semantic aliases, and supporting accent colors.
- Added typography tokens based on the Figma text presets and reusable global typography utility classes.
- Added spacing tokens from the Figma design system for consistent gaps, padding, and layout rhythm.
- Started the first reusable web UI component in `apps/web/src/components/sidebar/Sidebar.tsx`.
- Implemented the desktop sidebar foundation with:
  - expanded and collapsed states
  - logo swap between full and compact modes
  - nav items for overview, transactions, budgets, pots, and recurring bills
  - bottom toggle control for collapse/expand behavior
- Added sidebar-specific component styling in `apps/web/src/components/sidebar/Sidebar.module.css`.
- Replaced the default `apps/web` homepage starter content with a minimal preview layout that renders the sidebar component.

## Why this matters

- Establishes a real design-token foundation before building more screens and components.
- Keeps visual decisions centralized so future components reuse the same colors, type scale, spacing, radii, and shadows.
- Starts Milestone 2 with a meaningful navigation shell rather than disposable scaffold code.
- Creates a reusable sidebar entry point that can be refined and eventually wired to route-aware navigation.

## Commands used

- `Get-Content SESSION_START.md`
- `Get-Content apps/web/src/app/globals.css`
- `Get-Content apps/web/src/app/page.tsx`
- `Get-Content apps/web/src/app/page.module.css`
- `Get-ChildItem apps/web/public -Recurse`
- `Get-ChildItem apps/web/src -Recurse`

## Verification

- Global stylesheet read back after each token update and verified for:
  - color tokens
  - typography presets
  - spacing scale
- Sidebar component files read back and verified for:
  - correct local asset paths
  - collapsed state toggle
  - nav item structure
  - homepage render wiring
- Runtime verification not yet completed.
- `npm run dev`, linting, and browser validation were not run in this slice.

## Related docs

- `docs/plan.md`
- `docs/decisions/2026-03-10-web-local-dev.md`
- `apps/web/README.md`

## Next implementation step

- Refine the desktop sidebar to match the Figma default, hover, and active states more closely.
- Add selected-item treatment and route-aware active state behavior.
- Further break down the sidebar into smaller subcomponents when the main file starts carrying too much UI detail.
