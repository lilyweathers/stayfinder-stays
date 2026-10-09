# StayFinder

StayFinder is a fullstack course project. The repository currently contains a
Hono API written in TypeScript that reads and writes properties and bookings
through Supabase. The frontend is a Next.js/TypeScript skeleton with a placeholder homepage.

## Structure

```text
backend/   Hono API, TypeScript types, Zod validation, and API tests
frontend/  Next.js frontend, TypeScript, App Router, and ESLint
```

## Prepare and run the backend

Requires Node.js 20.9 or newer and npm. Run these commands in Bash from the
repository root:

```bash
cd backend
npm ci
cp -n .env.example .env
```

If you already have a configured `.env`, keep it instead of copying over it.
Fill in `SUPABASE_URL` and `SUPABASE_KEY` in `backend/.env` using your development
project's settings. The project needs existing `properties` and `bookings`
tables; installing dependencies does not create the database.

```bash
npm run typecheck
npm test
npm run build
npm run dev
```

The API runs at `http://localhost:3000` by default. Change `HONO_PORT` in `.env`
if needed. Stop the development server with Ctrl+C.

Tests mock Supabase HTTP responses and do not connect to your real database.
Passing tests verifies the covered API behavior, not the database schema or policies.

See [the backend README](backend/README.md) for routes, configuration, and
current limitations. Run backend npm commands from `backend/`.

## Run the frontend

In a separate Bash terminal, run from the repository root:

```bash
cd frontend
npm ci
cp -n .env.example .env.local
npm run dev
```

Open http://localhost:3001. The backend keeps port 3000, so both apps can run
at the same time. See [the frontend README](frontend/README.md) for checks and
file structure.

## Environment files

- `backend/.env`: local Supabase URL/key and optional backend port
- `frontend/.env.local`: local API URL for future frontend requests
- Each folder's `.env.example`: committed placeholders and public local defaults

Local environment files are ignored by Git. Copy examples only when the local
file does not already exist; `cp -n` preserves existing configuration. The
backend port defaults to 3000, and frontend scripts use 3001. If you change the
backend port, update the frontend API URL too. Restart the apps after changes.

## Assignment preparation

Authentication, authorization, and the remaining assignment features still need
to be implemented. The target is all G1-G16 and all VG1-VG7. Use the
[criteria checklist](docs/criteria.md) to track implementation, rule locations,
and test evidence. Keep API test requests for the submission. Never commit real environment values or privileged Supabase keys.

See the [authentication and API connection plan](docs/auth-api-plan.md) for the
proposed cookie flow, CORS settings, user context, and verification cases.

## Submission preparation

Use the [submission checklist](docs/submission.md) and the
[API request template](requests/stayfinder.http). Read the
[request instructions](requests/README.md) before running cases. Planned tests
are templates until their features and final API contracts are implemented.

### VG3 booking capacity

Apply migration `database/021_booking_capacity.sql` after 020, first checking `database/tests/capacity_preflight.sql`. Run rollback tests in `database/tests/capacity.sql`, then the live runner. Full instructions: [capacity verification](requests/capacity-live.md). Capacity comes from the saved property; upcoming active reservations prevent unsafe reductions.

### VG4 booking status and roles

Database enforcement already exists in migrations 002, 006 and 012. Run the expanded rollback test `database/tests/status_roles.sql` and the live runner using [status verification instructions](requests/status-live.md). General booking edits preserve saved status when omitted and check participant roles and allowed transitions.

### VG5 booking time rules

Apply `database/022_booking_time.sql` after 021 and run `database/tests/time_rules.sql`. Follow [time verification instructions](requests/time-live.md) for the live runner and documented Europe/Stockholm calendar-date policy. Same-day check-in is allowed; past check-in and mutations of already-past bookings are rejected.

### VG6 saved booking prices

Review `database/tests/price_preflight.sql`, apply `database/023_booking_price.sql` after 022, and run `database/tests/price.sql`. [Price verification instructions](requests/price-live.md) explain legacy backfill and the live runner. New bookings save the current database nightly rate; date edits use that saved rate, and property price changes leave existing totals intact.

VG6 also requires `database/024_property_price_precision.sql` before price tests, ensuring decimal property rates are supported on existing installations.
