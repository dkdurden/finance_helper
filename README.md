# finance_helper

Monorepo for a manual-first finance and grocery tracker.

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

## Milestone 0 status

- Monorepo folders created
- Docker Compose baseline added (`web`, `api`, `db`)
- Environment variable templates added

## Start services (baseline)

1. Copy env templates:
   - `Copy-Item .env.example .env`
   - `Copy-Item apps/api/.env.example apps/api/.env`
   - `Copy-Item apps/web/.env.example apps/web/.env.local`
2. Start containers:
   - `docker compose up --build`

Current `web` and `api` services are bootstrap placeholders so the stack starts cleanly.  
Next step is Milestone 1: scaffold Django + DRF in `apps/api`, then Milestone 2: scaffold Next.js in `apps/web`.