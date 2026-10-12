# StayFinder API

Hono, Node.js, TypeScript and Zod with Supabase Auth/PostgreSQL. See
[root setup](../README.md), [SQL setup](../database/README.md) and
[auth setup](../docs/auth-setup.md).

## Configuration and checks

Run npm ci in this folder; copy .env.example to .env only if absent.

| Variable | Purpose |
| --- | --- |
| SUPABASE_URL | Required Supabase project URL |
| SUPABASE_KEY | Required publishable/anon key; user sessions enforce RLS |
| SUPABASE_ADMIN_KEY | Optional backend-only secret/service-role key for account deletion and registration photos |
| HONO_PORT | Defaults to 3000 |
| FRONTEND_URL | Allowed origin, defaults to http://localhost:3001 |
| NODE_ENV | development locally; production enables secure cookies |

Commands: npm run dev, npm run typecheck, npm test, npm run build, npm start.
Tests mock Supabase; [live checks](../requests/README.md) verify the real database.

## Routes

| Method | Route | Access / behavior |
| --- | --- | --- |
| GET | / | Public API status |
| POST | /auth/register, /auth/login | Register (201, possibly confirmation) / login (200, cookies) |
| GET | /auth/me | Verified user; anonymous 401 |
| POST | /auth/logout | Clear session cookies |
| PATCH | /auth/profile | Current user's name, bio, photo |
| DELETE | /auth/account | Current user; requires password and admin key |
| GET | /profiles/:id | Public name, avatar, bio |
| GET | /properties | Public list, filters, availability search |
| GET | /properties/:id | Public details |
| GET | /properties/:id/availability, /properties/:id/host | Public date ranges / host name and avatar |
| POST | /properties | Authenticated; derives owner_id |
| PUT, PATCH | /properties/:id | Owner; full / partial fields |
| DELETE | /properties/:id | Owner-checked RPC; retains booking history |
| GET | /bookings | Guest's bookings; property_id query requires property ownership |
| GET | /bookings/:id | Booking guest or host |
| POST | /bookings | Derives guest_id, saves pending status and trusted price |
| PUT | /bookings/:id | Guest or host; full fields; omitted status is preserved |
| POST | /bookings/:id/confirm | Host, pending current/future booking |
| POST | /bookings/:id/cancel | Guest or host, pending/confirmed current/future booking |
| DELETE | /bookings/:id | Guest or host for active current/future; only host for cancelled |

Mutations require the configured frontend Origin; protected routes require session
cookies. Identity is verified with getUser and the request user's JWT reaches RLS.

Property filters: location (case-insensitive substring), max_price (inclusive),
guests (minimum capacity), sort=asc|desc. Optional check_in/check_out must occur
together and be valid today/future dates with checkout later than check-in.
Availability excludes pending/confirmed overlaps using [check_in, check_out).

Creates return 201; normal reads/updates/deletes 200. Validation returns 400,
authentication 401, role denial 403, absent/hidden rows 404, overlap/status/time
conflicts 409, unexpected DB errors 500. Capacity prechecks return 400; a changed
capacity rejected by PostgreSQL becomes 409. See [HTTP examples](../requests/stayfinder.http).

## Database enforcement

Apply migrations through 025. Schema types are in src/types/database.ts.
RLS protects owners and booking participants; triggers/constraints independently
enforce immutable identity, overlap, capacity, transitions, Stockholm time rules
and trusted prices. Client prices are discarded; date edits use the frozen rate.
The admin client is restricted to account/photo operations. Never commit credentials.
