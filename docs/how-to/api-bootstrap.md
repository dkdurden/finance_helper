# API Bootstrap (Docker-First)

This guide documents the current Docker-first setup used to bootstrap the Django API in this repository.

## Prerequisites

- Docker Desktop running.
- Root `.env` configured with Postgres values:
  - `POSTGRES_DB`
  - `POSTGRES_USER`
  - `POSTGRES_PASSWORD`

## 1. Start Postgres only

```bash
docker compose up -d db
docker compose ps
docker compose logs -f db
```

Expected log signal:

- `database system is ready to accept connections`

## 2. Build API image

```bash
docker compose build api
```

## 3. Scaffold Django project and app

```bash
docker compose run --rm api django-admin startproject config .
docker compose run --rm api python manage.py startapp finance
```

## 4. Verify API wiring

Health route:

- `GET /api/health/`

Run test:

```bash
docker compose run --rm api python manage.py test finance
```

## 5. Run API locally with Docker

```bash
docker compose up api
```

API is available at:

- `http://localhost:8000`

## Notes

- Postgres host mapping is `5433:5432` to avoid conflicts with locally installed Postgres on `5432`.
- Inside Docker network, API should use `db:5432` for Postgres host/port.
- `DATABASE_URL` is injected for `api` via `docker-compose.yml` from root `.env` values.
