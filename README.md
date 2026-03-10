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
- Milestone 2 in progress: Next.js web foundation in `apps/web`.
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
- `docs/decisions/2026-03-10-web-local-dev.md`
