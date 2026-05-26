# Web TODOs

## Overview Responsiveness

- Revisit `/overview` across mobile, tablet, and desktop widths with the Figma frames side by side.
- Tune spacing, card heights, and section ordering after visual browser review.
- Pay special attention to:
  - tablet transition around the sidebar/bottom navigation breakpoint
  - mobile transaction row fit for long merchant names
  - mobile Budgets chart and two-column category layout
  - mobile Recurring Bills row spacing and value alignment

## Transactions Responsiveness

- Revisit `/transactions` table behavior between mobile and desktop widths.
- Tune the transition from compact mobile rows to the full desktop table so tablet/intermediate widths do not feel cramped or misaligned.
- Pay special attention to category/date visibility, long recipient names, amount alignment, and horizontal spacing before API-backed data expands the row content.

## Budgets Responsiveness

- Revisit `/budgets` across mobile, tablet, and desktop widths with the Figma frames side by side.
- Tune the mobile header action and latest-spending row content so narrow widths do not clip text or controls.
- Handle add/edit/delete budget modals in mobile view, including overlay spacing, modal height, dropdown overflow, and bottom navigation clearance.
- Pay special attention to summary chart sizing, budget card padding, latest-spending row spacing, and bottom navigation clearance.

## Budgets Functionality

- Refine add/edit/delete budget modal behavior beyond the static prototype.
- Wire modal values to budget card data once the API/data shape is ready.
- Add validation for required category, maximum spend format, and unavailable/used theme colors.
- Decide how delete confirmation should update local/UI state before backend persistence exists.

## Pots Responsiveness

- Revisit `/pots` across mobile, tablet, and desktop widths with the Figma frames side by side.
- Tune pot card spacing, action button fit, and progress row alignment across narrow widths.
- Pay special attention to bottom navigation clearance and modal spacing on mobile.

## Pots Functionality

- Refine add/edit/delete pot modal behavior beyond the static prototype.
- Refine add money and withdraw action behavior, including amount entry and confirmation states.
- Wire modal values to pot card data once the API/data shape is ready.
- Add validation for required pot name, target amount format, transaction amount format, and unavailable/used theme colors.
