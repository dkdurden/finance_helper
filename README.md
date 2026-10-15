# finance_helper

Monorepo for a manual-first finance and receipt tracker.

## Structure

```text
apps/
  web/        # Next.js app (App Router)
  api/        # Django + DRF app
packages/
  shared/     # Shared types/utilities
infra/
  docker/     # Dockerfiles and container infra
docs/
  plan.md     # Project architecture and milestones
```

## Milestone status

- Milestone 0 complete: monorepo + Docker baseline.
- Milestone 1 complete: Django + DRF API foundation in `apps/api`.
  - Models + migrations + admin
  - DRF serializers + viewsets + routes
  - Endpoints: accounts, categories, transactions, transfers, products, receipts, receipt-items
  - Validation tests passing (`docker compose run --rm api python manage.py test finance`)
- Milestone 2 complete: Next.js web foundation in `apps/web`.
  - Primary authenticated page coverage is complete for the static Figma-driven prototype.
  - Django session auth, Next.js auth proxies, and protected app routes are implemented.
  - The current responsive baseline is accepted for Milestone 2; further visual refinement is deferred in `docs/post-mvp-todos.md` and is not considered finished.
  - `/transactions` performs an authenticated server-side Django API read with loading, empty, and error states.
- Milestone 3 complete: accounts and transaction flows.
  - Account CRUD, derived balances, and balance adjustments are implemented.
  - Normal transactions and atomic transfers support create, edit, and delete flows.
  - `/api/ledger-events/` provides the authenticated, paginated, one-row-per-event feed used by `/transactions`.
- Milestone 4 complete: receipt and product workflows.
  - Receipt creation, editing, and deletion keep transactions and receipt items synchronized.
  - Product creation, editing, search, purchase history, and archive/restore flows are implemented.
- Milestone 5 complete: reporting.
  - Monthly income and expense totals use calendar-safe dates and exclude transfers and adjustments.
  - The Overview shows live category spending, net worth, and the five latest ledger events.
- Next focus: V1 acceptance testing and prioritizing deferred post-MVP work.
- Current local development workflow:
  - `db` and `api` run through Docker Compose
  - `web` runs locally for reliable hot reload on Windows

## Start services

1. Copy env templates:
   - `Copy-Item .env.example .env`
   - `Copy-Item apps/api/.env.example apps/api/.env`
   - `Copy-Item apps/web/.env.example apps/web/.env.local`
2. Start backend containers:
   - `docker compose up --build db api`
3. Start the web app locally:
   - `Set-Location apps/web`
   - `npm install`
   - `npm run dev`

## Useful docs

- `docs/plan.md`
- `docs/how-to/api-bootstrap.md`
- `docs/how-to/api-core-endpoints.md`
- `docs/learn/milestone-1-notes.md`
- `docs/learn/milestone-2-notes.md`
- `docs/post-mvp-todos.md`
- `docs/decisions/2026-03-10-web-local-dev.md`
