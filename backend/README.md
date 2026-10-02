# StayFinder API

A REST API built with Hono, Node.js, TypeScript, and Zod. Active property and
booking routes use Supabase/PostgreSQL. The JSON files and JSON database helper
are legacy assets; property tests still use the JSON property data as fixtures.

## Requirements and setup

- Node.js 20 or newer and npm
- A development Supabase project with `properties` and `bookings` tables
- Database permissions that allow the intended queries

Run from `backend/` in Bash:

```bash
npm ci
cp -n .env.example .env
```

Skip the copy command if `.env` already contains your configuration.

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Your Supabase project URL; required |
| `SUPABASE_KEY` | The project API key used by the backend; required |
| `HONO_PORT` | API port; defaults to `3000` |

Keep `.env` in the `backend/` root and restart the API after changing it. Missing
`HONO_PORT` uses port 3000. Keep `.env` local. Never commit real keys or put privileged keys in frontend
code. The backend uses one configured Supabase client and does not yet forward
an authenticated user's session to the database.

```bash
npm run dev
```

Open `http://localhost:3000`, or the port configured in `.env`. Stop with Ctrl+C.
On Windows, Git Bash supports these commands. In PowerShell, use `npm.cmd` if
execution policy blocks `npm.ps1`.

## Commands and tests

```bash
npm run typecheck  # check source TypeScript without generating output
npm test           # compile and run API tests
npm run build      # compile the API into dist/
npm start          # run the compiled API
```

The tests replace Supabase HTTP requests with fake PostgREST responses. They
cover property and booking CRUD, validation, missing records, database errors,
duplicate booking IDs, and preservation of IDs from update URLs. They use dummy
environment values and do not read or modify your real Supabase database.

Tests model list responses as arrays and singular responses as objects. Routes
that may find no record use `maybeSingle()` so absence produces a `404`; create
routes use `single()` because creation should return exactly one record.

## API routes

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/` | API status text |
| GET | `/properties` | List properties |
| GET | `/properties/:id` | Get one property |
| POST | `/properties` | Create a property |
| PATCH | `/properties/:id` | Partially update a property |
| DELETE | `/properties/:id` | Delete a property |
| GET | `/bookings` | List bookings |
| GET | `/bookings/:id` | Get one booking |
| POST | `/bookings` | Create a booking |
| PUT | `/bookings/:id` | Replace booking fields |
| DELETE | `/bookings/:id` | Delete a booking |

List routes return arrays. Successful create, single-record read, update, and
delete routes return objects. Creates return `201`; other successful routes
return `200`. Invalid bodies return `400` with an `errors` array, missing records
return `404`, duplicate booking IDs return `409`, and database failures return
`500`.

## Database expectations

The current code expects these columns:

- `properties`: `property_id`, `title`, `description`, `location`,
  `price_per_night`, `max_guests`
- `bookings`: `booking_id`, `property_id`, `guest_name`, `guest_email`,
  `check_in`, `check_out`, `guests`, `status`

The database must generate property IDs and booking IDs when omitted. Booking
status defaults to `pending` in the API when omitted. An update URL's ID takes
precedence over an ID submitted in the body. Schema creation and migrations are
not currently included in this repository.

## Example request

With the API running and an existing property ID, run in Bash:

```bash
curl -i -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "property_id": "property_1001",
    "guest_name": "Alex Andersson",
    "guest_email": "alex@example.com",
    "check_in": "2026-10-10",
    "check_out": "2026-10-12",
    "guests": 2
  }'
```

This creates real data in the configured development database. Replace the
property ID and dates as appropriate.

## Current assignment scope

This is a starting point, not the completed assignment. API authentication,
authorization, filtering, sorting, and booking business rules are not yet
implemented. Booking date validation currently checks for nonempty strings,
not valid dates or their order. Database policies cannot be verified by the
mocked API tests. The Next.js frontend is a placeholder skeleton on port 3001; API integration
is still to be implemented.
