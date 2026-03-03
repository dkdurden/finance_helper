# Milestone 0 Notes (Repo Bootstrap)

Date: 2026-03-03

## What we built

- Monorepo folder structure (`apps`, `packages`, `infra`, `docs`)
- Baseline `docker-compose.yml` with `web`, `api`, and `db`
- Placeholder Dockerfiles for `web` and `api`
- `.env.example` templates with placeholder values

## Why this matters

- Creates a stable foundation before adding app code.
- Keeps local development close to production shape.
- Lets you reason about service boundaries early (frontend, backend, database).

## Concepts to learn

- Docker image vs container
- Docker Compose service/network/volume
- Environment variables and secret hygiene (`.env.example` vs `.env`)

## Commands to know

- `docker compose up --build`
- `docker compose ps`
- `docker compose logs -f api`
- `docker compose down`

## Pitfalls

- Committing real `.env` files
- Assuming placeholders are production-safe defaults
- Exposing ports broadly when only local access is needed