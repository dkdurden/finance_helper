# apps/web

Next.js frontend for the `finance_helper` project.

## Local development workflow

This repo currently uses a split local workflow:

- `db` and `api` run through Docker Compose from the repo root
- `web` runs locally for reliable hot reload during frontend development

## Setup

From the repo root, copy the web env template:

```powershell
Copy-Item apps/web/.env.example apps/web/.env.local
```

If the frontend needs to call the local Django API, set `API_BASE_URL` in `apps/web/.env.local` to `http://localhost:8000`.

`WEB_ALLOWED_ORIGINS` must contain the exact browser origins allowed to call
the web API, separated by commas and without paths. The example value permits
both `http://localhost:3000` and `http://127.0.0.1:3000`. If the development
port changes, update these origins to use the same port.

Set `NEXT_PUBLIC_APP_TIME_ZONE` to the IANA timezone that defines the app's
"today" and "current month" boundaries, such as `America/New_York`. Calendar
dates entered by users remain timezone-neutral.

## Run the backend services

From the repo root:

```powershell
docker compose up --build db api
```

## Run the web app locally

```powershell
Set-Location apps/web
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## Notes

- App Router source lives under `src/app`.
- Page-specific styles can stay colocated with routes as CSS Modules.
- Shared UI should move into `src/components` or `src/features` as reuse appears.
