# Deploy to Vercel

Live projects:
- Frontend: https://stayfinder-stays.vercel.app
- API: https://stayfinder-api.vercel.app

These projects were initially deployed with the Vercel CLI. Their project root
directories are now configured as `frontend` and `backend` for Git deployment.
Both projects are connected to `lilyweathers/stayfinder-stays` through the Vercel
GitHub app. Automatic deployments are enabled: pushes to `main` deploy to
production, while other branches create preview deployments. Production
environment variables are already configured in Vercel.

Create two Vercel projects from this repository. Supabase remains the database
and authentication provider; apply the database migrations through 025 first.

## API project

- Root Directory: `backend`
- Framework Preset: Hono
- Environment variables (Production): `SUPABASE_URL`, `SUPABASE_KEY`,
  optional `SUPABASE_ADMIN_KEY`, and `FRONTEND_URL`.
- Set `FRONTEND_URL` to the frontend's exact HTTPS production origin, without
  a trailing slash. Vercel sets `NODE_ENV=production` for secure cookies.
- Deploy and record the stable production URL.

The entry point exports the Hono application for Vercel and starts the Node
listener only when running locally. Keep the API deployment publicly accessible
so frontend server requests and rewrites can reach it.

## Frontend project

- Root Directory: `frontend`
- Framework Preset: Next.js
- Environment variables (Production):
  - `NEXT_PUBLIC_API_URL=/api`
  - `API_BACKEND_URL=https://your-api-project.vercel.app` (no trailing slash)
- Deploy, then set the API's `FRONTEND_URL` to this project's stable production
  URL and redeploy the API if that value changed.

Browser requests use the frontend's `/api` rewrite, keeping session cookies on
the frontend origin. Server-rendered pages use `API_BACKEND_URL` directly.
Changing either frontend variable requires a new build.

In Supabase Auth URL Configuration, set Site URL to the frontend production URL
and allow the appropriate production email-confirmation redirect URL.
Preview deployments need their own matching API origin configuration; the API
intentionally rejects mutations from other origins.

Verify `/api/` returns `StayFinder API`, property browsing loads, and login,
profile, bookings, and logout work. Use an existing test account to check login.
Never add real environment files or privileged keys to Git.
