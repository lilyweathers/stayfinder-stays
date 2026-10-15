# StayFinder

[Live site](https://stayfinder-stays.vercel.app/)

Fullstack course project with a Next.js/TypeScript frontend and Hono/TypeScript
API backed by Supabase Auth and PostgreSQL. Visitors browse, filter, sort and
search available properties. Guests book and manage stays; hosts manage their
properties and bookings. All G1–G16 and VG1–VG7 are fulfilled; see
[criteria and evidence](docs/criteria.md) and [submission checks](docs/submission.md).

## Setup

Requires Node.js 20.9 or newer, npm and a Supabase development project.
Follow [SQL setup](database/README.md) and [auth setup](docs/auth-setup.md).
In Bash, from the repository root:

```bash
cd backend
npm ci
cp -n .env.example .env
```

Keep an existing configured environment file. Fill in SUPABASE_URL and
SUPABASE_KEY with the project's publishable/anon key. SUPABASE_ADMIN_KEY is
optional for password-confirmed account deletion and registration photo uploads;
it stays in the backend. Normal data queries use the request user's token and
RLS. FRONTEND_URL defaults to http://localhost:3001; HONO_PORT defaults to 3000.
Run `npm run dev`.

In another terminal, from the repository root:

```bash
cd frontend
npm ci
cp -n .env.example .env.local
npm run dev
```

Open http://localhost:3001. NEXT_PUBLIC_API_URL must point to the API, normally
http://localhost:3000. Restart after environment changes. In PowerShell, use
npm.cmd if execution policy blocks npm.ps1; use Copy-Item for the examples only
when the destination does not already exist.

## Verification and files

From backend: `npm run typecheck`, `npm test`, `npm run build`.
From frontend: `npm run lint`, `npm run typecheck`, `npm run build`.
The 66 automated backend tests mock Supabase; database verification is separate.
[Request instructions](requests/README.md) link live runners for all seven VG
criteria, SQL tests and the final [HTTP request file](requests/stayfinder.http).

| Folder | Contents |
| --- | --- |
| backend | API, request-scoped authentication, validation, types, tests, live runners |
| frontend | Next.js pages, calendar, forms, property and booking management |
| database | Ordered migrations, policies, constraints, functions, rollback tests |
| requests | HTTP requests, Postman collections, live verification instructions |
| docs | Criteria evidence, auth setup, presentation and submission checklist |

Environment files and requests/local/ are ignored. Commit only placeholder
examples; keep real passwords, keys, JWTs and cookie jars local.
Submission branch: [main](https://github.com/lilyweathers/stayfinder-stays/tree/main).
