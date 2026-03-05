# Finance + Receipt Tracker - Architecture and Build Plan (V1, snake_case)

## Core Principles

- Manual-only data entry (no bank APIs)
- `transaction` table is the source of truth for money
- Receipt data is metadata attached to a transaction
- All monetary values stored as integer cents
- Account balances are derived, not stored

---

# Models (snake_case)

## account

Represents a financial account (checking, savings, cash, credit card, loan, investment, other).

- id
- name
- account_type
- is_liability (boolean)
- opening_balance_cents (int)
- opening_balance_date (datetime)
- created_at
- updated_at

### Balance Logic

`balance = opening_balance_cents + sum(transaction.signed_amount_cents)`

If `is_liability = true`, the balance represents amount owed.

---

## category

Used for reporting and grouping transactions.

- id
- name
- is_archived (boolean)
- created_at
- updated_at

Examples: groceries, rent, gym, income, adjustments.

---

## transaction (money source of truth)

Represents a single financial event.

- id
- date
- signed_amount_cents (int)
- transaction_type (`normal | adjustment | transfer`)
- merchant (nullable string)
- note (nullable string)
- category_id (fk -> category)
- account_id (fk -> account)
- transfer_id (nullable fk -> transfer)
- created_at
- updated_at

### Signed Amount Rules

For asset accounts:
- positive -> increases balance
- negative -> decreases balance

For liability accounts:
- positive -> increases amount owed
- negative -> decreases amount owed

---

## transfer

Represents a transfer event across two accounts.

- id
- date
- occurred_at (nullable datetime)
- amount_cents (int, > 0)
- from_account_id (fk -> account)
- to_account_id (fk -> account)
- note (nullable string)
- created_at
- updated_at

---

## product

Reusable product catalog item.

- id
- name
- default_unit (nullable string)
- is_archived (boolean)
- created_at
- updated_at

---

## receipt (header)

Represents one purchase receipt.

- id
- date
- store (nullable string)
- tax_cents (int default 0)
- fees_cents (int default 0)
- total_cents (int)
- transaction_id (unique fk -> transaction)
- created_at
- updated_at

### Total Rule

`total_cents = sum(receipt_item.line_total_cents) + tax_cents + fees_cents`

`transaction.signed_amount_cents` should reflect this total:
- negative for asset accounts
- positive for liability accounts

---

## receipt_item (line item)

Represents an item on a receipt.

- id
- receipt_id (fk -> receipt)
- product_id (fk -> product)
- name_snapshot (string)
- qty (nullable float/decimal)
- unit (nullable string)
- unit_price_cents (nullable int)
- line_total_cents (int)
- created_at
- updated_at

---

# Relationships

- `account 1 -----< transaction >----- 1 category`
- `transaction 1 ----- 0..1 receipt`
- `receipt 1 -----< receipt_item >----- 1 product`

---

# Balance Adjustment Flow

When user sets an account to a reported balance:

1. Compute current balance
2. Calculate difference
3. Create transaction:
   - signed_amount_cents = difference
   - transaction_type = adjustment
   - category = adjustments
   - note = "balance adjustment"

---

# Net Worth Calculation

`net_worth = sum(asset_balances) - sum(liability_balances)`

Where:
- asset = `account.is_liability = false`
- liability = `account.is_liability = true`

---

# Not Included in V1

- merchant model (separate entity)
- budgets
- subscriptions
- bank integrations
- reconciliation logic
- multi-user auth
- running balance column

---

# V1 Goals

- simple
- correct accounting behavior
- scalable structure
- easy to evolve
- manual-first

---

# Tech Stack + Architecture Plan (Next.js + Django + Postgres)

## High-level architecture

- **web app (Next.js)**
  - SSR/SEO pages (server components) where useful
  - client components for interactivity
  - call Django API from server side when possible
- **api (Django + DRF)**
  - owns business logic + database
  - exposes REST endpoints
- **database (Postgres)**
  - single source of truth for persisted data

### Request flow (recommended)

1. Browser requests a page from Next.js
2. Next.js server fetches data from Django API
3. Next.js renders HTML and returns to browser
4. Mutations call Django API from server actions/handlers

---

## Monorepo recommendation

Keep monorepo layout:

```text
repo/
  apps/
    web/
    api/
  packages/
    shared/
  infra/
    docker/
  docs/
    plan.md
```

---

## API contract

- Django provides REST endpoints
- Next.js fetches them server-side

Potential v1.1 improvement:
- DRF OpenAPI schema + generated TypeScript types for web app

---

## Authentication recommendation

For manual-entry single-user scope:
- Django auth + cookie-based session authentication

---

## Deployment recommendation

Docker Compose on a VPS:
- `web` (Next.js)
- `api` (Django + gunicorn)
- `db` (Postgres)
- reverse proxy (Caddy/Nginx) for TLS and routing

Routing:
- `https://yourdomain.com` -> Next.js
- `https://api.yourdomain.com` -> Django API

---

## Local development

Use Docker Compose for parity with production:
- `web`
- `api`
- `db`

Env vars:
- `DATABASE_URL` (api)
- `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`
- `API_BASE_URL` (web)

---

## Build milestones

### Milestone 0 - Repo bootstrap
- Create monorepo folders
- Add base docker-compose
- Verify `web`, `api`, `db` run together

### Milestone 1 - Django API foundation
- Create Django project + apps
- Add DRF
- Implement models
- Add migrations
- Add admin
- Add API endpoints/tests

### Milestone 2 - Next.js UI foundation
- App Router pages
- Basic layout + navigation
- Server-side data fetching from Django

### Milestone 3 - Transactions + accounts flows
- accounts CRUD
- transactions CRUD
- account balance view (derived)
- adjustment flow

### Milestone 4 - Receipt module UX
- products CRUD + search/autocomplete
- receipt create/edit (writes transaction + receipt + items)

### Milestone 5 - Reporting
- monthly totals
- spend by category
- net worth

---

## Notes on SSR + server-side API calls

- Next.js server components can fetch from API directly.
- Server Actions are useful for mutations without extra Next API routes.
