# StayFinder frontend

A Next.js frontend skeleton with TypeScript, App Router, ESLint, and plain CSS.
The homepage is a placeholder. Assignment pages and backend integration are
still to be implemented.

## Run in Bash

Requires Node.js 20.9 or newer and npm. From the repository root:

```bash
cd frontend
npm ci
npm run dev
```

Open http://localhost:3001. Stop the server with Ctrl+C.

The backend uses http://localhost:3000 by default. Run it in a separate terminal:

```bash
cd backend
npm run dev
```

## Checks and production build

Run from `frontend/`:

```bash
npm run lint
npm run typecheck
npm run build
npm start
```

`npm start` serves the production build on port 3001 and requires a successful
build first. Type checking generates Next.js route types before checking the
TypeScript source.

## Main files

- `src/app/page.tsx`: homepage
- `src/app/layout.tsx`: root layout and page metadata
- `src/app/globals.css`: global styles
- `next.config.ts`: Next.js configuration

## Environment configuration

From `frontend/` in Bash, copy the example only if `.env.local` does not exist:

```bash
cp -n .env.example .env.local
```

`NEXT_PUBLIC_API_URL=http://localhost:3000` records the backend address for
future browser requests. The placeholder homepage does not use it yet.
Keep `.env.local` in the `frontend/` root, alongside `package.json`, not in `src/`.
Restart the development server after changing environment values.

Next.js includes variables prefixed with `NEXT_PUBLIC_` in browser code. Use
that prefix only for public values; never for a privileged Supabase key or a
database password. Public variables are fixed when the production app is built.
See the [Next.js environment guide](https://nextjs.org/docs/app/guides/environment-variables).

Supabase frontend configuration will be added when implementing authentication.
