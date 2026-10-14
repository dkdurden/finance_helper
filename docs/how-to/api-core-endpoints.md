# Core API Endpoints (Milestone 1)

This guide summarizes the DRF resource endpoints currently exposed in Milestone 1.

Base path: `/api/`

Finance resource endpoints require Django session authentication. Authentication bootstrap endpoints explicitly allow unauthenticated access where needed. Signup is disabled by default unless `DJANGO_ALLOW_SIGNUP` is enabled.

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
- Clients submit only header fields; posting accounts and signs are derived by the backend.
- Create, update, and delete write the header and both transaction postings atomically.
- Transfer postings have null category, merchant, and note fields.
- Update and delete return `409 Conflict` if the existing posting pair is malformed.

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

Transaction-type validation rules:

- Normal and adjustment transactions require a category and a null `transfer` field.
- Transfer postings require a non-null `transfer` and a null category.
- Clients cannot create, update, or delete transfer postings through the Transaction endpoint. Use the Transfer endpoint to mutate the logical event.
- New transactions cannot use an archived category, and existing transactions cannot switch to one. Historical transactions already assigned to an archived category may retain it while other fields are updated.

`GET /api/transactions/` is posting-level and includes both internal postings for a transfer. Use the ledger event endpoint for user-facing transaction feeds.

## Ledger Events

- `GET /api/ledger-events/`

This authenticated, read-only endpoint combines normal transactions, balance adjustments, and transfers into one logical event feed. Each transfer appears once rather than exposing its two derived postings.

The response uses page-number pagination with 20 events per page:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "event_type": "transfer",
      "id": 1,
      "date": "2026-03-05",
      "occurred_at": null,
      "amount_cents": 10000,
      "transaction_type": "transfer",
      "merchant": null,
      "note": "Move cash",
      "category_id": null,
      "category_name": null,
      "account_id": null,
      "account_name": null,
      "from_account_id": 1,
      "from_account_name": "Checking",
      "to_account_id": 2,
      "to_account_name": "Savings"
    }
  ]
}
```

Supported query parameters:

- `page`: positive page number.
- `search`: case-insensitive matching across relevant merchant, note, category, and account names.
- `category`: positive category ID; transfers are excluded when this filter is active.
- `sort`: `latest`, `oldest`, `a-to-z`, `z-to-a`, `highest`, or `lowest`. Invalid values fall back to `latest`.

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
