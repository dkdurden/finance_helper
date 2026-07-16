# Post-MVP TODOs

Last updated: 2026-07-16

This document tracks product work that remains incomplete but is intentionally not required to close the current MVP milestone. Deferring an item means the current milestone accepts the existing implementation; it does not mean the underlying work is complete.

## Status definitions

- `deferred`: intentionally scheduled after the MVP.
- `in progress`: actively being refined after the MVP.
- `complete`: implemented and verified at the intended quality level.

## Deferred from Milestone 2

The primary authenticated pages have sufficient responsive behavior for the Milestone 2 UI foundation. Further breakpoint-by-breakpoint visual refinement is deferred and does not block Milestone 2 completion.

### Responsive refinement

#### Overview

Status: `deferred`

- Compare mobile, tablet, and desktop layouts with the Figma frames side by side.
- Tune spacing, card heights, and section ordering.
- Review the sidebar-to-bottom-navigation transition.
- Check long transaction merchant names on mobile.
- Refine the mobile Budgets chart and category layout.
- Refine Recurring Bills row spacing and value alignment.

#### Transactions

Status: `deferred`

- Refine the transition between compact mobile rows and the full desktop table.
- Review category and date visibility at intermediate widths.
- Check long recipient names, amount alignment, and horizontal spacing.

#### Budgets

Status: `deferred`

- Refine mobile header actions and latest-spending rows.
- Review mobile modal sizing, dropdown overflow, and bottom-navigation clearance.
- Tune summary chart sizing, card padding, and row spacing across breakpoints.

#### Pots

Status: `deferred`

- Tune card spacing, action-button fit, and progress-row alignment at narrow widths.
- Review bottom-navigation clearance and mobile modal spacing.

#### Recurring Bills

Status: `deferred`

- Tune summary-card layout, table spacing, search/sort controls, and mobile wrapping.
- Check long bill names, due-date status icons, amount alignment, and bottom-navigation clearance.

### Feature functionality

#### Budgets

Status: `deferred`

Budgets are explicitly outside the V1 scope in `docs/plan.md`. The existing Milestone 2 UI is accepted as a static interaction shell.

- Refine add, edit, and delete modal behavior.
- Connect modal values to budget-card state when a budget data model and API are defined.
- Validate required categories, maximum-spend values, and unavailable theme colors.
- Define temporary UI-state behavior and eventual persistence behavior for deletion.

#### Pots

Status: `deferred`

Pots do not have a V1 backend model or API. The existing cards and action controls are accepted as prototype shells.

- Refine add, edit, and delete modal behavior.
- Implement add-money and withdrawal flows, including amount entry and confirmation states.
- Connect modal values to pot-card state when a pot data model and API are defined.
- Validate pot names, target amounts, transaction amounts, and unavailable theme colors.

#### Recurring Bills

Status: `deferred`

Recurring bills do not have a dedicated V1 data model. The product must first decide whether they are derived from transactions or managed as independent records.

- Refine search and sorting behavior.
- Decide whether recurring bills need add, edit, and delete actions or remain derived from transactions.
- Connect rows, totals, and summary counts to the eventual data source.
- Add empty, loading, and no-results states.

## Deferred from Milestone 3

### Accessibility

#### Account actions menu

Status: `deferred`

- Improve the visual separation between the white account actions pop-up menu and the white account panel behind it.
- Add a clearly visible border, contrasting shadow, or background treatment without relying on color alone.
- Verify sufficient contrast in supported themes and confirm that keyboard focus remains clearly visible on the ellipsis trigger and menu actions.

## Adding future items

Add work here when it is intentionally removed from an MVP or milestone definition of done but still needs to be completed later. Include the originating milestone, current status, and concrete verification concerns so deferred work remains actionable.
