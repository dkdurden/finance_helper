# Milestone 1 Notes (Django API Foundation)

Date: 2026-03-04

## What we built so far

- Docker Postgres setup validated for local development.
- Host/container Postgres port split configured as `5433:5432` to avoid local Postgres conflicts.
- Django project scaffolded in `apps/api` (`config` project + `finance` app).
- Django dependencies added in `apps/api/requirements.txt`.
- API Docker image updated to install requirements and run Django dev server.
- Health endpoint added at `/api/health/` via the `finance` app.
- Health endpoint test added and passing.

## Why this matters

- Establishes a working backend runtime before model complexity.
- Confirms app routing and request/response flow independently of business logic.
- Keeps environment reproducible through Docker Compose.

## Commands used

- `docker compose down -v --remove-orphans`
- `docker compose up -d db`
- `docker compose logs -f db`
- `docker compose build api`
- `docker compose run --rm api django-admin startproject config .`
- `docker compose run --rm api python manage.py startapp finance`
- `docker compose run --rm api python manage.py test finance`

## Verification

- Postgres role and DB initialization validated in container.
- `GET /api/health/` returns JSON `{ "status": "ok" }`.
- Test suite status for current API app: `Ran 1 test ... OK`.

## Next implementation step

- Implement V1 `finance` domain models:
  - `Account`
  - `Category`
  - `Transaction`
  - `Product`
  - `GroceryTrip`
  - `GroceryTripItem`
- Register models in Django admin.
- Run `makemigrations` and `migrate` in Docker.
