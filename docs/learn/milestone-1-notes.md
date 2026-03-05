# Milestone 1 Notes (Django API Foundation)

Date: 2026-03-05

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
  - `Receipt`
  - `ReceiptItem`
- Monetary fields use integer cents with `BigIntegerField` for range safety.
- Added transfer integrity constraints and receipt non-negative/positive constraints.
- Added initial DRF API layer for core resources:
  - `AccountSerializer`, `CategorySerializer`, `TransactionSerializer`
  - `AccountViewSet`, `CategoryViewSet`, `TransactionViewSet`
  - Router endpoints under `/api/accounts/`, `/api/categories/`, `/api/transactions/`
- Added serializer-level transaction validation for transfer link rules:
  - `transaction_type=transfer` requires non-null `transfer`
  - non-transfer types require `transfer=null`
- Added API tests for create/list flows and transaction validation behavior.

## Why this matters

- Establishes a working backend runtime before API complexity.
- Confirms app routing and request/response flow independently of business logic.
- Locks in a durable data model with enforceable DB-level guardrails.
- Preserves accounting source-of-truth principle through `Transaction` rows.
- Exposes a usable CRUD API surface for early UI integration in Milestone 2.

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
- Core API endpoints available:
  - `GET/POST /api/accounts/`
  - `GET/POST /api/categories/`
  - `GET/POST /api/transactions/`
- Test suite status for current API app: `Ran 9 tests ... OK`.
- Finance migration state:
  - `[X] 0001_initial`
  - `[X] 0002_alter_account_opening_balance_cents_transfer_and_more`
  - `[X] 0003_grocerytrip_grocerytripitem_product_and_more`
- Django system checks: no issues.

## Related docs

- `docs/how-to/api-bootstrap.md`
- `docs/how-to/ledger-transfer-model.md`
- `docs/how-to/api-core-endpoints.md`

## Next implementation step

- Continue DRF API coverage for remaining finance resources (`Product`, `Transfer`, `Receipt`, `ReceiptItem`).
- Add targeted validation tests for each new resource.


