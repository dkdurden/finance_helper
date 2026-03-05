# Core API Endpoints (Account, Category, Transaction)

This guide summarizes the first DRF resource endpoints exposed in Milestone 1.

Base path: `/api/`

## Health

- `GET /api/health/`

Example response:

```json
{
  "status": "ok"
}
```

## Accounts

- `GET /api/accounts/`
- `POST /api/accounts/`
- `GET /api/accounts/<id>/`
- `PATCH /api/accounts/<id>/`
- `DELETE /api/accounts/<id>/`

Create example:

```json
{
  "name": "Checking",
  "account_type": "checking",
  "is_liability": false,
  "opening_balance_cents": 125000,
  "opening_balance_date": "2026-01-01T00:00:00Z"
}
```

## Categories

- `GET /api/categories/`
- `POST /api/categories/`
- `GET /api/categories/<id>/`
- `PATCH /api/categories/<id>/`
- `DELETE /api/categories/<id>/`

Create example:

```json
{
  "name": "Groceries",
  "is_archived": false
}
```

## Transactions

- `GET /api/transactions/`
- `POST /api/transactions/`
- `GET /api/transactions/<id>/`
- `PATCH /api/transactions/<id>/`
- `DELETE /api/transactions/<id>/`

Create normal transaction example:

```json
{
  "date": "2026-03-05",
  "signed_amount_cents": -2599,
  "transaction_type": "normal",
  "merchant": "Trader Joe's",
  "note": "Weekly groceries",
  "category": 1,
  "account": 1,
  "transfer": null
}
```

Transfer validation rules:

- If `transaction_type` is `transfer`, `transfer` must be non-null.
- If `transaction_type` is not `transfer`, `transfer` must be null.

## Run Verification

From repo root:

```powershell
docker compose run --rm api python manage.py test finance
```
