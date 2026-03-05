# Core API Endpoints (Milestone 1)

This guide summarizes the DRF resource endpoints currently exposed in Milestone 1.

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

## Products

- `GET /api/products/`
- `POST /api/products/`
- `GET /api/products/<id>/`
- `PATCH /api/products/<id>/`
- `DELETE /api/products/<id>/`

Create example:

```json
{
  "name": "Paper Towels",
  "default_unit": "pack",
  "is_archived": false
}
```

## Transfers

- `GET /api/transfers/`
- `POST /api/transfers/`
- `GET /api/transfers/<id>/`
- `PATCH /api/transfers/<id>/`
- `DELETE /api/transfers/<id>/`

Create example:

```json
{
  "date": "2026-03-05",
  "amount_cents": 10000,
  "from_account": 1,
  "to_account": 2,
  "note": "Move cash"
}
```

Validation rules:

- `amount_cents` must be `> 0`.
- `from_account` and `to_account` must differ.

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

Transfer-link validation rules:

- If `transaction_type` is `transfer`, `transfer` must be non-null.
- If `transaction_type` is not `transfer`, `transfer` must be null.

## Receipts

- `GET /api/receipts/`
- `POST /api/receipts/`
- `GET /api/receipts/<id>/`
- `PATCH /api/receipts/<id>/`
- `DELETE /api/receipts/<id>/`

Create example:

```json
{
  "date": "2026-03-05",
  "store": "Target",
  "tax_cents": 200,
  "fees_cents": 0,
  "total_cents": 2500,
  "transaction": 1
}
```

## Receipt Items

- `GET /api/receipt-items/`
- `POST /api/receipt-items/`
- `GET /api/receipt-items/<id>/`
- `PATCH /api/receipt-items/<id>/`
- `DELETE /api/receipt-items/<id>/`

Create example:

```json
{
  "receipt": 1,
  "product": 1,
  "name_snapshot": "Laundry Detergent",
  "qty": "1.000",
  "unit": "bottle",
  "unit_price_cents": 1299,
  "line_total_cents": 1299
}
```

Validation rules:

- `line_total_cents >= 0`
- `qty > 0` when provided
- `unit_price_cents >= 0` when provided

## Run Verification

From repo root:

```powershell
docker compose run --rm api python manage.py test finance
```
