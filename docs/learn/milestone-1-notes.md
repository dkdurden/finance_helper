# Milestone 1 Notes (Django API Foundation)

Date: 2026-03-04

## What we built

- Docker Postgres setup validated for local development.
- Host/container Postgres port split configured as `5433:5432` to avoid local Postgres conflicts.
- Django project scaffolded in `apps/api` (`config` project + `finance` app).
- Django dependencies added in `apps/api/requirements.txt`.
- API Docker image updated to install requirements and run Django dev server.
- Health endpoint added at `/api/health/` via the `finance` app.
- Health endpoint test added and passing.
- V1 finance models implemented and registered in Django admin:
  - `Account`
  - `Category`
  - `Transaction`
  - `Transfer`
  - `Product`
  - `GroceryTrip`
  - `GroceryTripItem`
- Monetary fields use integer cents with `BigIntegerField` for range safety.
- Added transfer integrity constraints and grocery non-negative/positive constraints.

## Why this matters

- Establishes a working backend runtime before API complexity.
- Confirms app routing and request/response flow independently of business logic.
- Locks in a durable data model with enforceable DB-level guardrails.
- Preserves accounting source-of-truth principle through `Transaction` rows.

## Commands used

- `docker compose down -v --remove-orphans`
- `docker compose up -d db`
- `docker compose logs -f db`
- `docker compose build api`
- `docker compose run --rm api django-admin startproject config .`
- `docker compose run --rm api python manage.py startapp finance`
- `docker compose run --rm api python manage.py test finance`
- `docker compose run --rm api python manage.py makemigrations finance`
- `docker compose run --rm api python manage.py migrate`
- `docker compose run --rm api python manage.py migrate finance 0003_grocerytrip_grocerytripitem_product_and_more`
- `docker compose run --rm api python manage.py showmigrations finance`
- `docker compose run --rm api python manage.py check`

## Verification

- Postgres role and DB initialization validated in container.
- `GET /api/health/` returns JSON `{ "status": "ok" }`.
- Test suite status for current API app: `Ran 1 test ... OK`.
- Finance migration state:
  - `[X] 0001_initial`
  - `[X] 0002_alter_account_opening_balance_cents_transfer_and_more`
  - `[X] 0003_grocerytrip_grocerytripitem_product_and_more`
- Django system checks: no issues.

## Related docs

- `docs/how-to/api-bootstrap.md`
- `docs/how-to/ledger-transfer-model.md`

## Next implementation step

- Add DRF serializers and viewsets for core resources.
- Expose initial CRUD endpoints under `/api/`.
- Add API tests for at least accounts, categories, and transactions.
