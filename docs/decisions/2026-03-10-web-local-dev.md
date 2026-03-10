# Run Web Locally During Development

Date: 2026-03-10

## Context

The initial repo setup included a Docker Compose service for `apps/web` so the full stack could run in containers.
During Milestone 2 frontend work on Windows, hot reload inside the `web` container proved unreliable because file watching across Docker bind mounts was inconsistent.

See: https://nextjs.org/docs/app/guides/local-development#8-consider-local-development-over-docker

## Decision

Use a split development workflow:

- run `db` and `api` through Docker Compose
- run `apps/web` locally with `npm run dev`

Keep the Docker-based backend workflow as the default for Django commands and database parity.

## Why

- More reliable Next.js hot reload for frontend work on Windows.
- Faster iteration on UI slices without container restarts.
- Keeps backend and database behavior close to production while reducing frontend dev friction.

## Impact

- Project docs and session-start guidance point to local web development.
- `apps/web/.env.local` becomes the preferred local frontend env file.
- The Docker Compose `web` service is not part of the normal day-to-day workflow for now.
