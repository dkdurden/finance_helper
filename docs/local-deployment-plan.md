# Local Home Deployment Plan

## Goal

Run Finance Helper continuously on one computer at home and access it from a
browser on that same computer. The deployment should use production processes,
preserve data across restarts, start predictably, and provide a documented
backup and restore path.

This plan does not expose the application to other devices or the public
internet. LAN or internet access requires a separate security review.

## Target architecture

The target is one Docker Compose project with three services:

1. `web`: Next.js built and started in production mode.
2. `api`: Django served by Gunicorn rather than Django's development server.
3. `db`: PostgreSQL with its data stored in a named Docker volume.

The browser connects only to the Next.js service on `localhost`. Next.js calls
Django over the private Compose network, and Django calls PostgreSQL over that
same network. Django and PostgreSQL do not need host ports for a same-computer
installation.

Suggested local address:

```text
http://localhost:3000
```

## Current readiness

Already available:

- Docker configuration for PostgreSQL and Django development.
- A named PostgreSQL volume for persistent database storage.
- Gunicorn in the Django Python dependencies.
- A successful Next.js production build.
- Django migrations and authenticated application routes.

Required before using the production stack:

- Add a production web image and enable the `web` Compose service.
- Change the API container from `manage.py runserver` to Gunicorn.
- Read Django's secret key, debug mode, and allowed hosts from environment
  variables instead of hardcoded development values.
- Add service health checks and startup dependencies.
- Run database migrations as an explicit deployment step.
- Define backup, restore, update, and rollback commands.

## Host prerequisites

The home computer needs:

- A supported 64-bit operating system.
- Docker Desktop on Windows or macOS, or Docker Engine with the Compose plugin
  on Linux.
- Git if the repository will be cloned or updated from source control.
- Approximately 2 GB of free memory for the application stack.
- Sufficient disk space for images, build layers, and database backups. Start
  with at least 5 GB free and monitor usage over time.
- A browser such as Firefox, Chrome, Edge, or Safari.

Node.js and Python should not be required on the host after all three services
are containerized.

## Configuration and secrets

Keep deployment values in untracked environment files. Do not commit real
credentials.

Root Compose environment:

```dotenv
COMPOSE_PROJECT_NAME=finance_helper
POSTGRES_DB=finance_helper
POSTGRES_USER=finance_helper
POSTGRES_PASSWORD=<long-random-password>
```

Django environment:

```dotenv
DJANGO_SECRET_KEY=<long-random-secret>
DJANGO_DEBUG=false
DJANGO_ALLOW_SIGNUP=true
ALLOWED_HOSTS=api,localhost,127.0.0.1
DATABASE_URL=postgresql://finance_helper:<password>@db:5432/finance_helper
```

Next.js environment:

```dotenv
API_BASE_URL=http://api:8000
NEXT_PUBLIC_APP_NAME=Finance Helper
NEXT_PUBLIC_APP_TIME_ZONE=America/New_York
```

The database password in `DATABASE_URL` must match `POSTGRES_PASSWORD`.
Generate the Django secret and database password with a secure password
generator. If signup is used to create the first account, change
`DJANGO_ALLOW_SIGNUP` to `false` afterward and restart the API service.

## Implementation phases

### Phase 1: production settings

- Update Django settings to parse the documented environment values.
- Fail startup when a production secret or database URL is missing.
- Keep secure-cookie options configurable. Plain HTTP on `localhost` cannot use
  HTTPS-only cookies, but a future HTTPS deployment should enable them.
- Run `python manage.py check --deploy` and document any intentionally deferred
  warnings.

### Phase 2: production images and Compose stack

- Add a multi-stage Next.js Dockerfile that installs locked dependencies,
  builds the app, and starts it with `next start` or standalone output.
- Start Django with Gunicorn and an appropriate worker timeout.
- Remove source-code bind mounts from the production Compose configuration.
- Keep only the web port published to the host.
- Add health checks for PostgreSQL, Django, and Next.js.
- Make dependent services wait for healthy upstream services where practical.
- Configure `restart: unless-stopped` for unattended recovery after reboot.

Use a separate production Compose file, such as
`docker-compose.production.yml`, so local development behavior remains intact.

### Phase 3: first installation

The intended operator workflow will be:

```powershell
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d db api
docker compose -f docker-compose.production.yml exec api python manage.py migrate
docker compose -f docker-compose.production.yml up -d web
docker compose -f docker-compose.production.yml ps
```

Then open `http://localhost:3000`, create the first account, disable signup in
the Django environment, and restart the API container.

Before the first release, verify whether the app needs a separate Django static
file collection step. The current API is JSON-only, but Django admin assets
would require production static-file handling.

### Phase 4: automatic startup

- Configure Docker Desktop to start when the user signs in, or enable the
  Docker service at boot on Linux.
- Confirm the Compose restart policies bring the stack back after a host
  restart.
- Document the manual fallback command:

```powershell
docker compose -f docker-compose.production.yml up -d
```

Do not place secrets directly in operating-system startup scripts.

## Data persistence and backups

The named PostgreSQL volume survives container replacement, but it is not a
backup. A hardware failure, accidental volume deletion, or database corruption
can still destroy it.

Use logical PostgreSQL backups written outside the Docker volume. The final
deployment should provide reviewed commands equivalent to:

```text
pg_dump -> timestamped compressed backup file on the host
pg_restore or psql -> newly created database
```

Backup policy:

- Create a backup before every application update.
- Create automatic daily backups if the app is used regularly.
- Retain multiple generations, for example seven daily and four weekly copies.
- Store at least one copy on another device or an encrypted backup service.
- Test restoration periodically; an untested backup is not sufficient.

The restore procedure must stop application writes, preserve the current
database until validation succeeds, restore into a clean database, and verify
account, transaction, receipt, product, and report data before removing the old
copy.

## Updates and rollback

For each update:

1. Review the incoming code and release notes.
2. Create and verify a database backup.
3. Record the currently deployed Git commit.
4. Pull or check out the intended release.
5. Rebuild the images.
6. Run migrations.
7. Restart the stack.
8. Run the acceptance checks below.

Application rollback means checking out the previous commit and rebuilding its
images. Database rollback is separate: Django migrations are not assumed to be
reversible. Restore the pre-update database backup if a migration cannot be
safely reversed.

## Acceptance checklist

Before calling the local deployment complete, verify:

- All containers are healthy after a clean start and after a host reboot.
- `http://localhost:3000` loads without exposing the API or database ports.
- Signup creates the initial user, and disabling signup prevents another user
  from registering.
- Login, logout, and session persistence work.
- Account create/edit, balance adjustment, and deletion rules work.
- Normal transaction and transfer create/edit/delete flows work.
- Receipt creation, editing, deletion, and inline product creation work.
- Product history, editing, archive, and restore work.
- Overview monthly totals, category spending, net worth, and recent ledger
  events agree with known sample data.
- Data remains after recreating the application containers.
- A database backup can be restored and produces the expected application data.
- The full Django test suite, frontend lint, and production frontend build pass
  for the deployed commit.

## LAN or internet access

Do not publish this initial deployment beyond the same computer.

LAN access would additionally require a stable host address, firewall rules,
host validation, CSRF trusted origins, and a decision about HTTP versus local
HTTPS. Public internet access would also require a domain name, TLS certificate,
reverse proxy, security updates, rate limiting, monitoring, and a safer remote
access strategy.

For occasional access from another device, a private VPN such as a home VPN or
an authenticated mesh VPN is preferable to directly forwarding router ports.
That expansion should receive its own threat review and deployment plan.

## Recommended implementation order

Implement the plan as small, independently verified slices:

1. Environment-driven Django production settings.
2. Production Django command and health check.
3. Production Next.js image.
4. Production Compose wiring with private API/database networking.
5. Migration and first-run procedure.
6. Backup and restore scripts with a test restoration.
7. Reboot persistence and the complete acceptance checklist.

