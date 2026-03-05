# Grocery to Receipt Terminology Rename

Date: 2026-03-05

## Context

The original data model used grocery-specific names (`GroceryTrip`, `GroceryTripItem`).
As API coverage expanded, the project scope needed to support mixed retail purchases (not only groceries).

## Decision

Rename grocery-specific entities to receipt-oriented names:

- `GroceryTrip` -> `Receipt`
- `GroceryTripItem` -> `ReceiptItem`
- `ReceiptItem.trip` -> `ReceiptItem.receipt`

Keep `Transaction` as the financial source of truth and treat receipt records as purchase metadata linked to transactions.

## Why

- Better domain fit for mixed purchase categories.
- Cleaner API naming (`/api/receipts/`, `/api/receipt-items/`).
- Avoids future churn when expanding beyond groceries.

## Impact

- Data-preserving rename migration added in `finance` app.
- Admin/model/docs updated to receipt terminology.
- Existing migration history preserved.
