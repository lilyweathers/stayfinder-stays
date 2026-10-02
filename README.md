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
