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
- Next: Milestone 2 (Next.js web foundation in `apps/web`) with server-side API integration.

## Start services

1. Copy env templates:
   - `Copy-Item .env.example .env`
   - `Copy-Item apps/api/.env.example apps/api/.env`
   - `Copy-Item apps/web/.env.example apps/web/.env`
2. Start containers:
   - `docker compose up --build`

## Useful docs

- `docs/plan.md`
- `docs/how-to/api-bootstrap.md`
- `docs/how-to/api-core-endpoints.md`
- `docs/learn/milestone-1-notes.md`
