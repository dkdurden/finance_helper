# Authentication Plan and Status

Created: 2026-05-29

Status updated: 2026-07-15

This document records the incremental authentication work added during Milestone 2. The original five implementation phases are complete; the remaining work is split between Milestone 2 integration follow-ups and later deployment/security hardening.
## Current state

- The project is a Next.js + Django + Postgres monorepo.
- Django owns users, passwords, authentication, and cookie-based sessions.
- Signup, login, logout, current-user lookup, and CSRF initialization are implemented in Django and exposed through narrow Next.js route-handler proxies.
- `/login` and `/signup` are public to unauthenticated users and redirect authenticated users to `/overview`.
- `/overview`, `/transactions`, `/budgets`, `/pots`, and `/recurring-bills` are protected by a server-side session check in the `(app)` route-group layout.
- Logout is available through a work-in-progress Settings modal in the sidebar.
- Focused backend tests cover signup, login success/failure, authenticated and unauthenticated current-user lookup, logout, and CSRF cookie initialization.
- The finance resource viewsets do not yet declare authenticated permissions, and finance records are not scoped to a user. This is acceptable only while the project retains its explicit single-user V1 scope and must be revisited before broader deployment.
- Future authenticated finance write proxies must forward Django's CSRF token, following the existing logout proxy pattern.

## Phase status

- [x] Phase 1: inspect the existing auth surface.
- [x] Phase 2: add backend session endpoints.
- [x] Phase 3: wire the frontend login proxy and form.
- [x] Phase 4: add logout and current-user proxies, plus CSRF initialization.
- [x] Phase 5: protect app routes and redirect authenticated users away from auth pages.

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
- A tiny CSRF initializer was implemented on 2026-06-18:
  - `GET /api/auth/csrf/` asks Django to set or refresh the `csrftoken` cookie
  - `GET /api/auth/csrf` proxies that request through Next.js and forwards the CSRF cookie to the browser
  - logout now forwards `X-CSRFToken` from the initialized `csrftoken` cookie when present
  - auth proxy routes append forwarded `Set-Cookie` headers so multiple cookies are not collapsed into a single malformed header
  - future authenticated write proxies still need to send `X-CSRFToken`
- Before HTTPS deployment, revisit Django CSRF Origin/Referer behavior:
  - proxy requests may need to forward `Origin` or `Referer`
  - deployment settings should define `CSRF_TRUSTED_ORIGINS` and proxy SSL handling deliberately
- Phase 5A app route protection was implemented on 2026-06-18:
  - primary app routes were moved under the URL-neutral `(app)` route group
  - `apps/web/src/app/(app)/layout.tsx` checks the Django session before rendering app pages
  - unauthenticated users are redirected to `/login`
  - pages keep their per-page `AppShell` wrappers for title/header action ownership
- Auth cleanup slices were implemented on 2026-07-02:
  - added `apps/web/src/lib/backendUrl.ts` to consolidate `API_BASE_URL` URL construction across auth helpers/routes
  - redirected authenticated users away from `/login` and `/signup` to `/overview` in the shared `(auth)` layout
  - updated successful signup to redirect to `/login` because signup creates a user but does not create a session
- Settings/logout UI was added as a work-in-progress access point on 2026-07-02:
  - added a Settings nav item that opens a modal
  - made logout available from that modal by initializing CSRF, posting to logout, and redirecting to `/login`
  - this is not the final settings UX; reevaluate the final placement, icon, and account/settings treatment later
- Next session note:
  - reevaluate the work-in-progress Settings/logout UI before finalizing the app navigation/account UX
  - consider auto-login-after-signup only as a separate backend/frontend slice

## Target V1 auth shape

- Django owns users, passwords, sessions, and authentication state.
- Next.js route handlers proxy browser auth requests to Django so backend URLs and cookie handling stay centralized.
- App routes such as `/overview`, `/transactions`, `/budgets`, `/pots`, and `/recurring-bills` require an authenticated session.
- Auth pages remain simple:
  - unauthenticated users can access `/login` and `/signup`
  - authenticated users should be redirected into the app
- This is still a single-user/manual-entry V1; avoid roles, teams, OAuth, password reset, and multi-user permissions until explicitly scoped.

## Completed implementation phases

### Phase 1: Inspect existing auth surface (complete)

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

### Phase 2: Backend session endpoints (complete)

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

### Phase 3: Frontend login proxy (complete)

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

### Phase 4: Logout and current-user proxy (complete)

Goal: expose frontend route handlers for logout and session lookup.

Candidate route handlers:

- `apps/web/src/app/api/auth/logout/route.ts`
- `apps/web/src/app/api/auth/me/route.ts`

Expected behavior:

- logout clears the Django session
- `me` returns the current user or `401`
- existing app shell can later use this to drive account UI

### Phase 5: Protect app routes (complete)

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

## Remaining Milestone 2 auth work

- Reevaluate the provisional Settings/logout placement as part of final app navigation and account UX.
- Complete modal accessibility behavior, especially initial focus, focus containment, and focus restoration.
- Reuse the CSRF initialization and forwarding pattern when authenticated finance mutation proxies are introduced.
- Manually verify signup, login, protected-route redirects, authenticated-user redirects, and logout as part of the final Milestone 2 browser pass.
- Keep auth integrated with the first server-side Django API reads rather than creating a second client-side authentication state.

These items support the Milestone 2 Next.js foundation. They should not block responsive page polish or the first authenticated server-side finance reads.

## Later security and deployment hardening

- Add login throttling before the auth flow is exposed beyond the local prototype.
- Configure `CSRF_TRUSTED_ORIGINS`, secure cookie settings, and proxy SSL handling for the final HTTPS deployment topology.
- Decide when DRF finance resource endpoints should require authentication directly.
- If the product expands beyond single-user V1, add explicit user ownership and queryset scoping for finance records before supporting multiple users.
- Add broader frontend auth tests when a frontend test framework is selected.

## Constraints for future auth work

- Work incrementally.
- Inspect and summarize before editing.
- Propose one small next step only.
- Stop and ask: `Proceed with this step?`
- Do not run broad test suites without approval.
- Do not introduce OAuth, password reset, role-based permissions, or multi-user finance scoping unless explicitly approved.
- Keep architecture aligned with Next.js route handlers and Django session auth.
- Run Django commands through Docker Compose from the repo root.
- Keep frontend commands local inside `apps/web`.
- Do not commit secrets or edit local environment files.

## Recommended next auth-related slice

When Milestone 2 begins replacing static page data, add one authenticated server-side read from a Next.js page or feature layer to Django. Keep that slice read-only and limited to one resource so session forwarding, loading, empty, and error behavior can be validated before introducing authenticated mutations and CSRF handling.