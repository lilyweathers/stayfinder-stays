# Frontend, API, and authentication plan

Status: historical preparation plan. The three-lecture implementation is now
documented in [auth-setup.md](auth-setup.md). Its basic RLS policies do not yet
implement the ownership and VG rules proposed below. The remaining text records
the original plan, not the current implementation.

Original status: preparation only. None of the proposed authentication routes, cookie
handling, CORS settings, or database policies below are implemented by this step.
The planned approach uses Hono to manage Supabase Auth sessions in cookies.
Compare it with the lesson code before implementing; this is a proposed project
architecture, not a claim about how the course implemented authentication.

## Addresses and responsibilities

| Part | Development address | Responsibility |
| --- | --- | --- |
| Next.js frontend | http://localhost:3001 | Forms, navigation, session display, previews, loading/error views |
| Hono backend | http://localhost:3000 | Auth endpoints, session verification, validation, rule checks, database calls |
| Supabase Auth | Existing project | Accounts, password verification, issuing/refreshing tokens |
| PostgreSQL | Existing project | Ownership, row-level security, constraints, atomic booking rules |

Use localhost consistently rather than mixing it with 127.0.0.1. Different
ports mean different origins, even though these addresses are the same site.
Cookies are scoped by host and path, not by port. Use distinct cookie names
for this project and avoid sharing them with unrelated local applications.

The browser will call Hono using NEXT_PUBLIC_API_URL. Keep secrets in backend/.env.
No Supabase browser client is needed for this proposed backend-managed flow.

## Planned session flow

1. The frontend posts credentials to Hono using credentials: "include".
2. Hono uses a request-specific Supabase Auth client to authenticate.
3. Hono writes access and refresh tokens into HttpOnly cookies. It returns only
   the user information needed by the UI, never passwords or refresh tokens.
4. After reload, the frontend requests GET /auth/me, including cookies, to restore
   its user display. The navigation stays in a loading state until this resolves.
5. Before protected operations, Hono verifies the access token with Supabase
   getUser(token). Do not trust a user ID in the body or an unverified decoded JWT.
6. If the access token expires, use the refresh token through Supabase Auth,
   verify the resulting identity, and replace both cookies. Failed refresh clears
   the session and produces 401 on protected endpoints. Coordinate concurrent
   refresh requests so token rotation does not overwrite a newer session.
7. Logout invalidates the Supabase session as supported by Auth and clears both
   cookies using the same names and path. Previously issued JWTs can remain valid
   until expiry; test and explain this behavior rather than promising instant
   revocation of all access tokens.

Supabase issues both access and refresh tokens; getUser checks identity through
Auth. These choices follow the [session guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide)
and [getUser reference](https://supabase.com/docs/reference/javascript/auth-getuser).
This HttpOnly design keeps authentication in Hono. It differs from a design
where Supabase's browser client reads and refreshes cookies itself.

## Proposed auth endpoints

These names are planned API contracts, not working endpoints yet.

| Method | Path | Planned result |
| --- | --- | --- |
| POST | /auth/register | Validate credentials and register; handle confirmation-required accounts explicitly |
| POST | /auth/login | Authenticate, set cookies, return public user information |
| GET | /auth/me | Verify/refresh session and return user; return 401 if there is no valid session |
| POST | /auth/logout | Invalidate session where possible and clear cookies |

If email confirmation is enabled in the existing project, registration may
create an account without a session. Show a confirmation message and require
confirmation before login. Inspect the current Supabase Auth settings and
configure confirmation/redirect handling during implementation; do not disable
confirmation merely to hide an incomplete registration flow.

Public property reads remain available without login. Property writes and all
booking access require authentication. Anonymous /auth/me is an expected state,
not a global application failure. Authenticated requests with insufficient
permissions are denied, with resource visibility taken into account.

## Cookies and browser requests

Proposed cookie names: stayfinder_access_token and stayfinder_refresh_token.

- HttpOnly: browser JavaScript cannot read the tokens.
- Path=/: available to all API routes; use this same path when clearing them.
- SameSite=Lax: suitable for the planned same-site local setup.
- Secure: enabled with HTTPS in production; local HTTP development needs a
  development-specific setting.
- Set explicit expiry aligned with the intended session and refresh policy.
- Never cache personalized auth responses; send Cache-Control: no-store.

Every browser API request in this cookie-based plan uses credentials: "include",
including login, logout, and session lookup. This lets cross-origin requests send
cookies and lets the browser accept session cookies from the API response.

The initial session display can use client-side /auth/me requests. A future
Next.js server-side fetch does not automatically forward the browser's cookies
to Hono; it needs explicit cookie forwarding and deliberate handling of refreshed
Set-Cookie responses. Do not assume browser-fetch behavior applies on the server.

## CORS and CSRF plan

Add Hono CORS middleware before the routes during implementation:

- Allowed origin: exactly http://localhost:3001 in development, not wildcard *.
- credentials: true.
- Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS.
- Headers: Content-Type and any deliberately added request headers.
- Handle OPTIONS preflight before authentication checks.

Use a documented backend FRONTEND_ORIGIN setting when this is implemented.
The existing environment files do not yet include or consume that setting.
See [Hono CORS middleware](https://hono.dev/docs/middleware/builtin/cors).

CORS controls browser access; it does not authenticate users or stop direct API
calls. Cookie-authenticated mutations also need CSRF protection. Validate the
Origin against the exact frontend origin for browser writes, including login
and logout. Define missing-Origin behavior explicitly: for this plan require
an allowed Origin on mutations, including command-line test requests. Reject
mismatched origins rather than only omitting CORS headers. SameSite alone does
not protect against every same-site, different-origin request.

For a later deployment, choose HTTPS domains and revisit SameSite, cookie scope,
CORS, and CSRF together. A cross-site deployment can need different cookie
settings and can be affected by browser third-party-cookie restrictions.

## Keep user identity all the way to PostgreSQL

The existing backend has a global Supabase client. During implementation,
replace its use for authenticated operations with a client per request using a
publishable/legacy anon project key and the verified user's access token in
Authorization: Bearer <token>. Disable server-client session persistence and
avoid mutating a global client's session between different users.

The verified user token is what lets PostgreSQL policies evaluate auth.uid().
Set owner/user IDs from that identity and ensure database policies reject spoofed
ownership too. A service-role/secret key can bypass row-level security; do not
use it for ordinary user data operations. Inspect the configured key's role
locally before implementing without committing or printing it.
See [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).

VG booking rules need database enforcement beyond row-level security: plan
constraints, triggers, or database functions for dates, capacity, status, pricing,
and overlap. Atomic database operations must handle concurrent booking attempts.
Any privileged database function needs its own identity checks and restricted
execution permissions. Availability queries must filter without exposing other
users' booking details.

## Verification during implementation

- [ ] Login sets HttpOnly cookies; token values are not returned to frontend code.
- [ ] Reload identifies the same user through /auth/me.
- [ ] Expired access token refreshes; invalid refresh logs the user out cleanly.
- [ ] Concurrent requests during refresh do not corrupt the session.
- [ ] Logout clears cookies; explain remaining JWT lifetime accurately.
- [ ] Registration handles the project's email-confirmation setting.
- [ ] Browser preflight and credentialed requests succeed from port 3001.
- [ ] Disallowed-origin mutations are rejected; OPTIONS does not require login.
- [ ] Anonymous property reads work; anonymous writes and booking reads fail.
- [ ] Two different users cannot inherit each other's Supabase session.
- [ ] API and direct Supabase requests both enforce ownership and booking rules.
- [ ] Error responses distinguish invalid input, missing login, forbidden action,
  missing resource, booking conflicts, and unexpected server errors.

Use curl's cookie jar (-c and -b) for future API auth tests. Include the allowed
Origin header on mutations under this plan. Keep actual passwords, tokens, and
cookie jars out of Git. This planning step does not execute auth or write tests.
