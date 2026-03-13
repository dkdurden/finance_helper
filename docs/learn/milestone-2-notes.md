# Milestone 2 Notes (Next.js UI Foundation)

Date: 2026-03-11

## What we built

- Milestone 2 frontend work is currently being treated as a Figma-driven app prototype so layout and component fidelity can be validated before deeper API wiring.
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
- Added the `motion` package to `apps/web` for UI animation experiments and component-level interaction work.
- Built isolated motion exploration components beside the sidebar files to test:
  - layout and presence animation
  - drag and staggered motion patterns
  - arc-based toggle icon motion studies
- Integrated the motion work back into the real sidebar toggle so the minimize icon now animates with a curved travel path and rotation rather than a simple CSS flip.
- Restored the homepage preview to render the real sidebar component after the motion experiments.

## Why this matters

- Keeps the current frontend milestone focused on turning approved Figma screens into a usable prototype before expanding into broader feature integration.
- Establishes a real design-token foundation before building more screens and components.
- Keeps visual decisions centralized so future components reuse the same colors, type scale, spacing, radii, and shadows.
- Starts Milestone 2 with a meaningful navigation shell rather than disposable scaffold code.
- Creates a reusable sidebar entry point that can be refined and eventually wired to route-aware navigation.
- Validates `motion` as a practical tool for UI interactions that are awkward to express with CSS-only transforms.
- Reduces the risk of overcomplicating the main sidebar component by testing animation ideas in isolated playground components first.

## Commands used

- `Get-Content SESSION_START.md`
- `Get-Content apps/web/src/app/globals.css`
- `Get-Content apps/web/src/app/page.tsx`
- `Get-Content apps/web/src/app/page.module.css`
- `Get-ChildItem apps/web/public -Recurse`
- `Get-ChildItem apps/web/src -Recurse`
- `npm run lint`
- `git status --short`
- `git diff -- apps/web/package.json apps/web/package-lock.json apps/web/src/components/sidebar/Sidebar.tsx apps/web/src/components/sidebar/Sidebar.module.css`

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
- Motion experiment and sidebar toggle files were read back after each animation slice to verify:
  - `motion/react` imports
  - continuous arc path logic
  - toggle icon motion integration
  - homepage restoration to the real sidebar
- `npm run lint` passed after the motion dependency install, the sidebar toggle integration, and the homepage swap back to the real sidebar.
- Browser validation was used informally during iteration, but no automated runtime test was added in this slice.

## Related docs

- `docs/plan.md`
- `docs/decisions/2026-03-10-web-local-dev.md`
- `docs/decisions/2026-03-11-sidebar-toggle-motion.md`
- `apps/web/README.md`

## Next implementation step

- Continue the Figma-based frontend prototype work by finishing the sidebar component as a reusable navigation shell.
- Build the mobile and tablet sidebar layouts next so the navigation pattern works across the primary responsive breakpoints.
- Revisit selected-item treatment and route-aware active state behavior after the responsive sidebar structure is in place.