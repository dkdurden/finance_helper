# Session Start Guide (for New AI Context)

Last updated: 2026-03-13

Use this file at the beginning of any new chat/session so the assistant can start with full project context and minimal back-and-forth.

## Copy/Paste Kickoff Prompt

```md
You are working in the `finance_helper` repo.

Read these files first:

1. README.md
2. docs/plan.md
3. docs/README.md
4. docs/learn/milestone-1-notes.md
5. docs/learn/milestone-2-notes.md
6. docs/how-to/api-core-endpoints.md
7. docs/how-to/ledger-transfer-model.md
8. apps/web/AGENTS_STYLE_GUIDE.md
9. docs/decisions/2026-03-10-web-local-dev.md

Then do the following:

- Summarize current project state in 5-10 bullets.
- Propose the next concrete implementation step aligned to milestones.
- Propose one small implementation step and wait for approval before implementing.
- Add/update learning notes in `docs/learn/milestone-<n>-notes.md`.
- Explain what changed, why, and how to run/verify locally.
- After each step, pause for confirmation before proceeding.

Constraints:

- Keep architecture aligned with Next.js + Django + Postgres plan.
- Use integer cents for money fields.
- Transaction is source of truth for balances.
- Run Django commands through Docker Compose from repo root.
- Prefer Git Bash for shell-based text editing or patch-style command work when it is more reliable than PowerShell.
- Do not commit real secrets.
- Keep docs updated as features are added.
```

## Current Project Snapshot

- Milestone 0 completed (repo bootstrap).
- Milestone 1 completed in `apps/api`.
- Django + DRF project scaffolded and running in Docker.
- `finance` app includes models and migrations for:
  - `Account`, `Category`, `Transaction`, `Transfer`
  - `Product`, `Receipt`, `ReceiptItem`
- Money fields use integer cents with `BigIntegerField`.
- Transfer and receipt integrity constraints are implemented at DB level.
- Health endpoint exists at `GET /api/health/`.
- API endpoints exposed under `/api/` for:
  - `accounts`, `categories`, `transactions`, `transfers`
  - `products`, `receipts`, `receipt-items`
- Admin registrations exist for current finance models.
- Current API test status: `Ran 21 tests ... OK`.
- Current Milestone 2 work in `apps/web` is being handled as a Figma-driven frontend prototype.
- Completed frontend prototype slices so far:
  - responsive sidebar navigation for desktop, tablet, and mobile
  - reusable button component with primary, secondary, tertiary, and destroy variants
  - reusable text input and select-style field components under `apps/web/src/components/input`
- Local development workflow is Docker for `db`/`api` and local Next.js dev for `apps/web`.

## Next Recommended Step

Continue Milestone 2 by implementing the next Figma-driven frontend component or screen slice in `apps/web`, building on the existing sidebar, button, and input foundations.

## Definition of Done Per Milestone

- Feature/code implemented.
- Basic verification commands included.
- Docs updated:
  - `docs/learn/milestone-<n>-notes.md`
  - `docs/how-to/<topic>.md` when relevant.
  - `docs/decisions/YYYY-MM-DD-<topic>.md` when a meaningful tradeoff is made.

## Local Safety Rules

- Never commit `.env`, only `.env.example`.
- Keep dev credentials out of tracked files.
- Prefer localhost-bound ports for local-only services when practical.

## Quick Command Reference

```powershell
Copy-Item .env.example .env
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
docker compose up --build db api
docker compose ps
docker compose logs -f api
docker compose down
Set-Location apps/web
npm install
npm run dev
docker compose run --rm api python manage.py test finance
```
