# Ledger Transfer Model (Account + Transaction + Transfer)

This note explains how transfer data is represented in V1 and where constraints are enforced.

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
- Business rule expects one transfer to have exactly two transaction legs.

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

## What DB constraints enforce now

- `Transfer.amount_cents > 0`
- `Transfer.from_account != Transfer.to_account`
- `Transaction.transaction_type == transfer` requires non-null `transfer_id`
- Non-transfer transaction types require null `transfer_id`

## What app logic must enforce

- Exactly two transaction legs per transfer.
- One leg for `from_account`, one for `to_account`.
- Opposite signs with equal absolute amount.

This exact-2-leg rule is not guaranteed by a simple foreign key alone.
