# Ledger Transfer Model (Account + Transaction + Transfer)

This note explains how transfer data is represented in V1 and where constraints are enforced. This is independent of receipt/item metadata naming.

## Core idea

- `Transaction` remains the source of truth for balances.
- `Transfer` is a header/event record that links transfer legs.
- A transfer is represented by two transaction rows with the same `transfer_id`.

## Entity diagram

```text
Account
-------
id
name
is_liability
...

Transfer
--------
id
date
occurred_at
amount_cents
from_account_id -> Account.id
to_account_id   -> Account.id
...

Transaction
-----------
id
date
occurred_at
signed_amount_cents
transaction_type (normal | adjustment | transfer)
category_id? -> Category.id (nullable for transfers)
account_id   -> Account.id
transfer_id? -> Transfer.id (nullable)
...
```

## Relationship diagram

```text
Account 1 -----< Transaction >----- 0..1 Transfer
   ^                                  |
   |                                  |
   +------ from_account_id -----------+
   +------ to_account_id -------------+
```

Interpretation:
- Each transaction affects exactly one account (`account_id`).
- A transaction may or may not belong to a transfer (`transfer_id` nullable).
- A transfer references two accounts (`from_account`, `to_account`).
- Every valid transfer has exactly two derived transaction postings.
- Transfer postings have no category, merchant, or note. Logical transfer metadata lives on the `Transfer` header.

## Example: move $100 from Checking to Savings

```text
Transfer T1:
- amount_cents = 10000
- from_account = Checking
- to_account   = Savings

Transaction A (source leg):
- account = Checking
- signed_amount_cents = -10000
- transaction_type = transfer
- transfer_id = T1

Transaction B (destination leg):
- account = Savings
- signed_amount_cents = +10000
- transaction_type = transfer
- transfer_id = T1
```

## Sign derivation

`from_account` is the source of funds or value. `to_account` is the destination. `Account.is_liability` determines each posting sign.

| Source | Destination | Source posting | Destination posting | Example |
| --- | --- | ---: | ---: | --- |
| Asset | Asset | `-amount` | `+amount` | Checking to savings |
| Asset | Liability | `-amount` | `-amount` | Checking pays a credit card |
| Liability | Asset | `+amount` | `+amount` | Credit-card cash advance to checking |
| Liability | Liability | `+amount` | `-amount` | One debt source pays another debt |

The same-sign asset/liability cases are intentional. Net worth remains neutral because liability balances represent a positive amount owed and are subtracted from assets.

## What DB constraints enforce now

- `Transfer.amount_cents > 0`
- `Transfer.from_account != Transfer.to_account`
- `Transaction.transaction_type == transfer` requires non-null `transfer_id`
- Non-transfer transaction types require null `transfer_id`
- Transfer postings require `category_id = null`
- Normal and adjustment postings require a non-null category
- A transfer cannot have two postings for the same account

## Service-owned lifecycle

- Clients create, edit, or delete the logical event through the Transfer endpoint.
- A backend service creates the header and both postings in one database transaction.
- The service derives accounts, signs, dates, and null posting metadata; clients never submit individual transfer postings.
- Updates lock and validate the existing header and postings before changing all three records atomically.
- Deletes lock and validate the event, then remove both postings and the protected header atomically.
- The general Transaction endpoint rejects direct creation, editing, or deletion of transfer postings.
- Malformed existing transfers fail with a conflict response instead of being guessed at or silently repaired.

The database constraints prevent several invalid shapes, but exactly two correctly matched postings is an application-service invariant rather than a simple foreign-key constraint.

## Current read-model gap

`GET /api/transactions/` remains a posting-level endpoint and therefore returns both rows for a transfer. The global Transactions UI needs a separate event-level feed that represents each transfer once and paginates logical events rather than postings.

