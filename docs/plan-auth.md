# Authentication Plan

Date: 2026-05-29

This document is a handoff plan for adding authentication after the current Milestone 2 frontend prototype work. It is intentionally sliced so an agent can pause between steps and avoid turning auth into a broad, end-to-end rewrite.

## Current state

- The project is a Next.js + Django + Postgres monorepo.
- Django and DRF are already scaffolded in `apps/api`.
- The current API exposes finance resources under `/api/`.
- The frontend has `/login` and `/signup` routes.
- Signup is partially wired through a Next.js route handler:
  - `apps/web/src/app/api/auth/signup/route.ts`
  - `apps/web/src/features/auth/components/SignUpCard.tsx`
- The signup flow can create a backend user.
- Login, logout, current-user lookup, and protected app routes are not complete.
- The preferred V1 auth direction in `docs/plan.md` is Django auth with cookie-based sessions.

## Working notes

- Inspection on 2026-06-18 confirmed the public auth URLs are `/login` and `/signup`, but the Next.js page files live under the `(auth)` route group:
  - `apps/web/src/app/(auth)/login/page.tsx`
  - `apps/web/src/app/(auth)/signup/page.tsx`
- The signup path is already wired end to end:
  - `SignUpCard` posts `{ name, email, password }` to `/api/auth/signup`.
  - `apps/web/src/app/api/auth/signup/route.ts` proxies to Django at `/api/auth/signup/` via `API_BASE_URL`.
  - `SignUpView` validates with `SignUpSerializer`, creates a `finance.User`, and returns `id`, `name`, and `email`.
- Existing signup tests cover success, duplicate email, and weak password handling.
- `LoginCard` is currently visual-only and has no submit handler or Next.js login route handler yet.
- Django already has auth, sessions, CSRF, and authentication middleware enabled.
- The custom `finance.User` model removes `username` and uses unique `email` as `USERNAME_FIELD`, so login should authenticate with email and password.
- Phase 2 should stay backend-only and avoid protecting frontend routes until the login proxy exists.
- Phase 2 backend session endpoints were implemented and verified on 2026-06-18:
  - `POST /api/auth/login/`
  - `POST /api/auth/logout/`
  - `GET /api/auth/me/`
  - `docker compose run --rm api python manage.py test finance` ran 29 tests successfully.
- Frontend auth wiring must handle Django/DRF CSRF for authenticated unsafe requests:
  - logout will need a valid `X-CSRFToken` once the browser has a session cookie
  - future authenticated `POST`, `PUT`, `PATCH`, and `DELETE` requests to finance endpoints will need the same handling
- Login throttling is intentionally deferred, but should be added before this auth flow ships beyond the local prototype.
- Phase 3 frontend login wiring was implemented on 2026-06-18:
  - `apps/web/src/app/api/auth/login/route.ts` proxies login requests to Django and forwards the session cookie
  - `LoginCard` submits email/password to the route handler, shows concise errors, and redirects to `/overview` on success
  - route protection, logout proxying, and current-user proxying remain deferred to later phases
- Phase 4 narrow frontend proxies were implemented on 2026-06-18:
  - `apps/web/src/app/api/auth/me/route.ts` forwards browser cookies to Django and returns the current user or `401`
  - `apps/web/src/app/api/auth/logout/route.ts` forwards browser cookies to Django and forwards any clearing session cookie
  - logout UI wiring and end-to-end CSRF token forwarding remain deferred

## Target V1 auth shape

- Django owns users, passwords, sessions, and authentication state.
- Next.js route handlers proxy browser auth requests to Django so backend URLs and cookie handling stay centralized.
- App routes such as `/overview`, `/transactions`, `/budgets`, `/pots`, and `/recurring-bills` require an authenticated session.
- Auth pages remain simple:
  - unauthenticated users can access `/login` and `/signup`
  - authenticated users should be redirected into the app
- This is still a single-user/manual-entry V1; avoid roles, teams, OAuth, password reset, and multi-user permissions until explicitly scoped.

## Suggested phases

### Phase 1: Inspect existing auth surface

Goal: understand what is already present before editing.

Read:

- `apps/api/config/settings.py`
- `apps/api/config/urls.py`
- `apps/api/finance/urls.py`
- `apps/api/finance/views.py`
- `apps/api/finance/tests.py`
- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/signup/page.tsx`
- `apps/web/src/app/api/auth/signup/route.ts`
- `apps/web/src/features/auth/components/SignUpCard.tsx`

Deliverable:

- summarize the current signup path
- identify the smallest backend endpoint slice
- stop and ask: `Proceed with this step?`

### Phase 2: Backend session endpoints

Goal: add a minimal Django session-auth API.

Candidate endpoints:

- `POST /api/auth/login/`
- `POST /api/auth/logout/`
- `GET /api/auth/me/`

Implementation notes:

- Prefer Django's built-in authentication helpers:
  - `authenticate`
  - `login`
  - `logout`
- Return a small user payload from `me`, such as:

```json
{
  "id": 1,
  "name": "Demo User",
  "email": "demo@example.com"
}
```

- Return `401` for unauthenticated `me`.
- Return validation-friendly errors for invalid login credentials.
- Keep this slice backend-only unless the user approves frontend wiring.

Verification:

```powershell
docker compose run --rm api python manage.py test finance
```

Docs:

- update `docs/learn/milestone-2-notes.md` with what changed
- consider adding `docs/how-to/auth-flow.md` only after the flow is wired end to end

### Phase 3: Frontend login proxy

Goal: wire the existing login page to the backend without protecting app routes yet.

Candidate files:

- `apps/web/src/app/api/auth/login/route.ts`
- `apps/web/src/features/auth/components/LoginCard.tsx`

Expected behavior:

- submit username/email and password from the login form
- call the Next.js login route handler
- proxy to Django login
- redirect to `/overview` on success
- display a concise invalid-login message on failure

Verification:

```powershell
Set-Location apps/web
npm run lint
npm run dev
```

Manual browser check:

- invalid credentials show an error
- valid credentials reach `/overview`

### Phase 4: Logout and current-user proxy

Goal: expose frontend route handlers for logout and session lookup.

Candidate route handlers:

- `apps/web/src/app/api/auth/logout/route.ts`
- `apps/web/src/app/api/auth/me/route.ts`

Expected behavior:

- logout clears the Django session
- `me` returns the current user or `401`
- existing app shell can later use this to drive account UI

### Phase 5: Protect app routes

Goal: prevent unauthenticated app access.

Candidate approach:

- Add a server-side auth check in the shared app shell or route layout.
- Redirect unauthenticated users to `/login`.
- Redirect authenticated users from `/login` and `/signup` to `/overview`.

Protected routes:

- `/overview`
- `/transactions`
- `/budgets`
- `/pots`
- `/recurring-bills`

Keep this slice narrow. Do not refactor the whole app shell unless inspection shows there is no smaller clean path.

## Testing expectations

Backend:

- login success
- login failure
- logout
- `me` authenticated
- `me` unauthenticated

Frontend:

- lint after every frontend slice
- manual browser verification for login and route redirects
- add component or route tests later only if a test framework is already present or approved

## Constraints for the next agent

- Work incrementally.
- Inspect and summarize before editing.
- Propose one small next step only.
- Stop and ask: `Proceed with this step?`
- Do not run broad test suites without approval.
- Do not introduce OAuth, password reset, role-based permissions, or multi-user finance scoping in this auth pass.
- Keep architecture aligned with Next.js route handlers + Django session auth.
- Run Django commands through Docker Compose from the repo root.
- Keep frontend commands local inside `apps/web`.
- Do not commit secrets or edit local env files.

## Recommended first implementation slice

Start with Phase 1 inspection, then propose Phase 2 as a backend-only slice:

> Add `POST /api/auth/login/`, `POST /api/auth/logout/`, and `GET /api/auth/me/` with focused backend tests.

This gives the project a real session foundation before the frontend route protection work begins.
