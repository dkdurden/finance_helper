# Session Start Guide (for New AI Context)

Last updated: 2026-03-04

Use this file at the beginning of any new chat/session so the assistant can start with full project context and minimal back-and-forth.

## Copy/Paste Kickoff Prompt

```md
You are working in the `finance_helper` repo.

Read these files first:
1. README.md
2. docs/plan.md
3. docs/README.md
4. docs/learn/milestone-0-notes.md

Then do the following:
- Summarize current project state in 5-10 bullets.
- Propose the next concrete implementation step aligned to milestones.
- Implement that step end-to-end (code + docs update).
- Add/update learning notes in `docs/learn/milestone-<n>-notes.md`.
- Explain what changed, why, and how to run/verify locally.

Constraints:
- Keep architecture aligned with Next.js + Django + Postgres plan.
- Use integer cents for money fields.
- Transaction is source of truth for balances.
- Do not commit real secrets.
- Keep docs updated as features are added.
```

## Current Project Snapshot

- Milestone 0 completed (repo bootstrap).
- Monorepo directories exist: `apps/web`, `apps/api`, `packages/shared`, `infra/docker`, `docs`.
- `docker-compose.yml` exists with `web`, `api`, `db` baseline services.
- `apps/web` and `apps/api` are placeholders (not fully scaffolded frameworks yet).
- `.env.example` files use placeholders only (no real values).
- Learning docs structure exists:
  - `docs/decisions/`
  - `docs/how-to/`
  - `docs/learn/`

## Next Recommended Step

Milestone 1: scaffold Django + DRF in `apps/api` and implement V1 data models + migrations.

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
Copy-Item apps/web/.env.example apps/web/.env.local
docker compose up --build
docker compose ps
docker compose logs -f api
docker compose down
```