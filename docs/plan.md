# Finance + Receipt Tracker --- Architecture & Build Plan (V1, snake_case)

## Core Principles

- Manual-only data entry (no bank APIs)
- transaction table is the source of truth for money
- receipt data is detailed metadata attached to a transaction
- all monetary values stored as integer cents
- account balances are derived, not stored

---

# Models (snake_case)

## account

Represents a financial account (checking, savings, credit card, loan,
etc.)

- id
- name
- account_type (checking \| savings \| cash \| credit_card \| loan \|
  investment \| other)
- is_liability (boolean)
- opening_balance_cents (int)
- opening_balance_date (datetime)
- created_at
- updated_at

### Balance Logic

balance = opening_balance_cents + sum(transaction.signed_amount_cents)

If is_liability = true, the balance represents amount owed.

---

## category

Used for reporting and grouping transactions.

- id
- name
- is_archived (boolean)
- created_at
- updated_at

Examples: - groceries - rent - gym - income - adjustments

---

## transaction (money source of truth)

Represents a single financial event.

- id
- date
- signed_amount_cents (int)
- transaction_type (normal \| adjustment)
- merchant (string nullable)
- note (string nullable)
- category_id (fk → category)
- account_id (fk → account)
- receipt_id (nullable fk → receipt)
- created_at
- updated_at

### Signed Amount Rules

For asset accounts: - positive → increases balance - negative →
decreases balance

For liability accounts: - positive → increases amount owed - negative →
decreases amount owed

---

## product

Reusable product catalog item.

- id
- name
- default_unit (string nullable)
- is_archived (boolean)
- created_at
- updated_at

---

## receipt (receipt header)

Represents one receipt/purchase event.

- id
- date
- store (string nullable)
- tax_cents (int default 0)
- fees_cents (int default 0)
- total_cents (int)
- transaction_id (unique fk → transaction)
- created_at
- updated_at

### Total Rule

total_cents = sum(receipt_item.line_total_cents) + tax_cents +
fees_cents

transaction.signed_amount_cents must reflect this total: - negative for
asset accounts - positive for liability accounts

---

## receipt_item (receipt line item)

Represents what was purchased on a specific receipt.

- id
- receipt_id (fk -> receipt)
- product_id (fk → product)
- name_snapshot (string)
- qty (float nullable)
- unit (string nullable)
- unit_price_cents (int nullable)
- line_total_cents (int)
- created_at
- updated_at

---

# Relationships

account 1 ────\< transaction \>──── 1 category

transaction 1 ──── 1 receipt

receipt 1 ────\< receipt_item \>──── 1 product

---

# Balance Adjustment Flow

When user sets an account to a reported balance:

1.  Compute current balance
2.  Calculate difference
3.  Create transaction:
    - signed_amount_cents = difference
    - transaction_type = adjustment
    - category = adjustments
    - note = "balance adjustment"

---

# Net Worth Calculation

net_worth = sum(asset_balances) - sum(liability_balances)

Where: - asset = account.is_liability = false - liability =
account.is_liability = true

---

# Not Included in V1

- merchant model
- transfers
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

# Tech stack + architecture plan (Next.js + Django + Postgres)

## High-level architecture

- **web app (Next.js)**
  - SSR/SEO pages (server components) as needed
  - client components only when you need interactivity
  - calls the Django API **from the server** when possible (keeps API keys/logic off the browser)
- **api (Django + Django REST Framework)**
  - owns business logic + database (Postgres via Django ORM)
  - exposes REST endpoints (JSON)
- **database (Postgres)**
  - single source of truth for persisted data

### Request flow (recommended)

1. Browser requests a page from **Next.js**
2. Next.js server fetches data from **Django API** (server-side)
3. Next.js renders HTML (SSR) and returns to browser
4. For mutations (create/edit), Next.js calls Django API (server action → API)

This matches your goal: SSR/SEO + “do API calls on the server side” where it makes sense.

---

## Monorepo vs separate repos

**Recommendation: monorepo** (easier dev + deploy + shared types/docs).

Suggested structure:

```
repo/
  apps/
    web/                 # Next.js (App Router)
    api/                 # Django project (DRF)
  packages/
    shared/              # (optional) shared utils/types (OpenAPI-generated types later)
  infra/
    docker/              # dockerfiles, compose, nginx/caddy configs
  docs/
    plan.md
```

---

## API contract (how Next talks to Django)

### Preferred approach

- Django provides REST endpoints
- Next.js fetches them **server-side** (server components / route handlers / server actions)

### Helpful additions (v1.1)

- Add an **OpenAPI schema** from DRF and generate TypeScript types for the web app.

---

## Authentication recommendation (manual-only app)

Because this is a **manual-entry, single-user app**, you can keep auth simple.

Use **Django auth with cookie-based session authentication**

## Deployment recommendation

Since you’re doing Next.js + Django + Postgres, the simplest, most reliable path is:

### Recommended: Docker Compose on a VPS

- `web` (Next.js)
- `api` (Django + gunicorn)
- `db` (Postgres)
- reverse proxy (Caddy or Nginx) for TLS + routing

Why:

- predictable
- cheap
- easy backups (Postgres volume)
- deploy both services together

If you’d rather use a managed platform, common options people use for container apps include **Fly.io** and **Render**, and DigitalOcean App Platform is another common choice.

### Routing

- `https://yourdomain.com` → Next.js
- `https://api.yourdomain.com` → Django API

---

## Local development (recommended)

Use docker-compose for everything so dev ≈ prod:

- `web`: Next.js dev server
- `api`: Django dev server
- `db`: Postgres with volume

Environment variables:

- `DATABASE_URL` (api)
- `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`
- `API_BASE_URL` (web)

---

## Build milestones (stack-specific)

### Milestone 0 — Repo bootstrap

- Create monorepo folders
- Add base docker-compose
- Verify `web`, `api`, `db` all run together

### Milestone 1 — Django API foundation

- Create Django project + app(s)
- Add DRF
- Implement models from the V1 spec
- Add migrations
- Add admin for quick inspection

### Milestone 2 — Next.js UI foundation

- App Router pages
- Basic layout + navigation
- Server-side data fetching from Django

### Milestone 3 — Transactions + accounts flows

- accounts CRUD (requires opening_balance inputs)
- transactions CRUD
- account balance view (derived)
- adjustment flow (creates adjustment transaction)

### Milestone 4 - Receipt module

- products CRUD + search/autocomplete
- receipt create/edit (writes transaction + receipt + items)

### Milestone 5 — Reporting

- monthly totals
- spend by category
- net worth

---

## Notes on SSR + server-side API calls

- Next.js server components can fetch from your API directly (simple and common). citeturn0search14turn0search11
- Server Actions are useful for mutations without creating extra Next API routes; you can call your Django API from them. citeturn0search8





