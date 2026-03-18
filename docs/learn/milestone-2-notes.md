# Milestone 2 Notes (Next.js UI Foundation)

Date: 2026-03-18

## What we built

- Milestone 2 frontend work is currently being treated as a Figma-driven app prototype so layout and component fidelity can be validated before deeper API wiring.
- Replaced the default Next.js global starter styles in `apps/web/src/app/globals.css` with Figma-aligned design tokens.
- Added shared color tokens for the app palette, including neutrals, semantic aliases, and supporting accent colors.
- Added typography tokens based on the Figma text presets and reusable global typography utility classes.
- Added spacing tokens from the Figma design system for consistent gaps, padding, and layout rhythm.
- Built the first reusable navigation shell in `apps/web/src/components/sidebar/Sidebar.tsx`.
- Implemented the sidebar prototype across responsive breakpoints with:
  - desktop expanded and collapsed states
  - tablet bottom navigation treatment
  - mobile icon-only bottom navigation treatment
  - Figma-aligned hover and active states for the compact nav variants
- Added page-shell spacing so content clears the fixed tablet/mobile navigation.
- Added a reusable button component in `apps/web/src/components/button/Button.tsx` with:
  - `primary`
  - `secondary`
  - `tertiary`
  - `destroy`
- Added a reusable input field system in `apps/web/src/components/input/` with:
  - basic text field
  - field with trailing search icon
  - field with prefix text
  - separate select-style color-tag field component
- Implemented real interaction states for the basic input work:
  - hover and focus via CSS
  - filled styling that works for both controlled and uncontrolled usage
  - helper text and label associations for accessibility
- Improved the select-style field to keep native select semantics while preserving the Figma placeholder treatment as closely as possible.
- Added targeted inline comments and TODO notes in the input/select files to document current tradeoffs and next accessibility follow-ups.
- Added `/login` and `/signup` auth routes with a shared auth layout and Figma-aligned shell styling.
- Wired the signup form end to end:
  - `apps/web/src/features/auth/components/SignUpCard.tsx` now submits a real form
  - `apps/web/src/app/api/auth/signup/route.ts` proxies signup requests through Next.js to the Django backend
  - successful signup now creates a real backend user from the frontend flow
- Extracted a shared app shell for authenticated app pages in `apps/web/src/components/layout/` and moved sidebar layout concerns under that shared area.
- Split the dashboard route so `/` redirects to `/overview` and the app overview lives on its own page route.
- Added the first real Overview dashboard slices:
  - summary cards row with an `OverviewSummaryCard` component under `apps/web/src/features/overview/components/`
  - `Pots` panel using the existing pot icon asset and Figma-aligned spacing
  - `Transactions` panel using existing avatar assets and spacing refined against the direct Figma component
- Added a dedicated `/transactions` page skeleton using the shared app shell, ready for later toolbar/table implementation.

## Why this matters

- Keeps the current frontend milestone focused on turning approved Figma screens into a usable prototype before expanding into broader feature integration.
- Establishes a real design-token foundation before building more screens and components.
- Keeps visual decisions centralized so future components reuse the same colors, type scale, spacing, radii, and shadows.
- Creates a reusable navigation shell that now works across the primary responsive breakpoints.
- Builds out a reusable component base so future screens can reuse buttons and field patterns instead of duplicating UI work.
- Preserves native input and select semantics while still tracking closely to the Figma component language.
- Introduces the first thin backend-for-frontend layer in Next.js, which keeps backend URLs server-side and creates a clean pattern for future auth/API integration.
- Establishes the first reusable app-page frame and proves the Overview dashboard can be built incrementally as a set of Figma-driven sections instead of one large page rewrite.

## Commands used

- `Get-Content session_start.md`
- `Get-Content README.md`
- `Get-Content docs/learn/milestone-2-notes.md`
- `Get-Content apps/web/src/app/page.tsx`
- `Get-Content apps/web/src/app/page.module.css`
- `Get-Content apps/web/src/components/sidebar/Sidebar.tsx`
- `Get-Content apps/web/src/components/sidebar/Sidebar.module.css`
- `Get-Content apps/web/src/components/button/Button.tsx`
- `Get-Content apps/web/src/components/button/Button.module.css`
- `Get-Content apps/web/src/components/input/InputField.tsx`
- `Get-Content apps/web/src/components/input/InputField.module.css`
- `Get-Content apps/web/src/components/input/SelectField.tsx`
- `Get-Content apps/web/src/components/input/SelectField.module.css`
- `Get-Content apps/web/src/components/layout/AppShell.tsx`
- `Get-Content apps/web/src/components/layout/AppShell.module.css`
- `Get-Content apps/web/src/app/overview/page.tsx`
- `Get-Content apps/web/src/app/overview/page.module.css`
- `Get-Content apps/web/src/features/overview/components/OverviewSummaryCard.tsx`
- `Get-Content apps/web/src/features/overview/components/OverviewSummaryCard.module.css`
- `Get-Content apps/web/src/app/transactions/page.tsx`
- `Get-Content apps/web/src/app/transactions/page.module.css`
- `git status --short`
- `git commit`

## Verification

- Sidebar files were read back after each responsive slice to verify:
  - desktop, tablet, and mobile layout behavior
  - fixed bottom-nav treatment
  - hover and active state updates
- Button files were read back after each variant slice to verify:
  - variant mapping
  - primary, secondary, tertiary, and destroy styling
  - tertiary caret behavior and hover treatment
- Input/select files were read back after each slice to verify:
  - basic, icon, and prefix field variants
  - native select behavior for the color-tag field
  - helper text and label associations
  - real filled-state handling for controlled and uncontrolled input usage
- Auth route and signup files were read back after each slice to verify:
  - auth route structure and metadata
  - shared auth layout behavior
  - signup form submission flow through the Next.js proxy route
- Overview shell and section files were read back after each slice to verify:
  - `/overview` route structure
  - shared app shell usage
  - summary card component extraction
  - `Pots` panel structure and icon usage
  - `Transactions` panel structure and alignment against the direct Figma component
- Informal browser validation was used during iteration, but no automated frontend runtime test was added in these frontend slices.

## Related docs

- `docs/plan.md`
- `docs/decisions/2026-03-10-web-local-dev.md`
- `docs/decisions/2026-03-11-sidebar-toggle-motion.md`
- `apps/web/README.md`

## Next implementation step

- Build the `Budgets` panel on `/overview` as the next small Figma-driven dashboard slice.
- Keep the shared app shell and tertiary-button pattern for future overview sections so panel actions stay consistent.
- Continue future form work aligned with the current input/select split:
  - `InputField` for text-entry variants
  - `SelectField` for dropdown/select-style variants
- Revisit accessibility and auth follow-ups later for:
  - field-level validation display
  - signup success redirect or post-signup flow
  - login/session integration
