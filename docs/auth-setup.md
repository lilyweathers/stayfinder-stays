# Supabase Auth: the three Hono lectures

Implemented: request-specific `@supabase/ssr` clients, `optionalAuth`,
`requireAuth`, register/login/me/logout, credentialed CORS and protected routes.
`getUser()` verifies identity. The cookie adapter reads all incoming cookies and
writes refreshed tokens automatically; no manual `session_expired` refresh branch.
Tokens stay in HttpOnly cookies and are not returned in JSON. Responses use
`Cache-Control: private, no-store`.

## Finish in Supabase

1. In Authentication → Providers, enable Email.
2. In `backend/.env`, keep `SUPABASE_URL` and set `SUPABASE_KEY` to the
   publishable or legacy anon key. Never use a secret/service-role key here.
   Add `FRONTEND_URL=http://localhost:3001` and `NODE_ENV=development`.
3. If email confirmation is enabled, confirm the email before logging in.
   Registration returns `confirmationRequired: true` when no session is issued.
   Configure the project's Site URL for the confirmation redirect.
4. Inspect existing policies in the dashboard or SQL Editor:

   ```sql
   select tablename, policyname, roles, cmd, qual, with_check
   from pg_policies where schemaname = 'public'
   and tablename in ('properties', 'bookings');
   ```

5. Run `database/001_auth_rls.sql` in the project's SQL Editor. This assumes the
   existing tables and normal Supabase table grants. Review any old policies;
   another permissive policy can still allow anonymous booking access.

On 2026-10-06, the basic policies in `database/001_auth_rls.sql` were applied
to the existing `stay-finder` Supabase project. The dashboard reported successful
SQL execution. Email authentication and signups were already enabled, email
confirmation remains enabled, and Site URL was changed to http://localhost:3001.
These are the lecture's basic policies: any authenticated user can modify any
property and read/modify any booking. Per-user ownership is a later extension.

## Test locally

From `backend`, run `npm install` and `npm run dev`. Use
`requests/auth.http` in REST Client, or Postman/Insomnia with a cookie jar.
Do not mix localhost with 127.0.0.1.

Expected: anonymous property reads succeed; anonymous property writes,
booking access, `/auth/me`, and `/auth/logout` return 401. Login sets cookies;
me and protected routes then succeed. Logout clears the session cookies.
Login failures return 400, following the lesson.

Frontend browser requests must include cookies on every call:

```ts
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ email, password }),
});
```

The frontend is currently a placeholder; no login UI is implemented.
SameSite=Lax supports the localhost setup and same-site HTTPS deployments.
Revisit cookie settings for different production sites. Browser mutation
requests with an unexpected Origin are rejected; requests without Origin are
allowed for REST clients, matching the lectures.

## Exit ticket

1. Authentication checks who you are; authorization checks what you may do.
2. A request client keeps each user's cookies and database identity isolated.
3. `optionalAuth` sets the request client and a verified user or null.
4. `requireAuth` returns 401 when there is no verified user.
5. `credentials: "include"` lets cross-origin browser calls send/accept cookies.
6. RLS also protects rows when clients call Supabase directly.
7. An access token proves identity for requests; a refresh token obtains new tokens.
8. Backend cookie writing preserves the refreshed session in the browser.
9. `getSession()` alone does not verify the cookie's user with Auth.
10. Missing/invalid refresh tokens mean no verified user and 401 on protected routes.

## Development email and Postman verification

Mailtrap Email Sandbox is configured as custom SMTP in the hosted project.
Its sandbox host is sandbox.smtp.mailtrap.io; port 2525 was saved after delivery
failed with the initial settings. SMTP credentials stay in Supabase and are not
stored in this repository. Confirmation emails are captured in Mailtrap, not
sent to real recipient inboxes. Supabase Pro does not remove the built-in email
service's low sending limit; custom SMTP is configured separately.

Registration and login were verified through user-provided Postman responses on
2026-10-06. Email confirmation was verified in the dashboard. The user also
confirmed the live Postman sequence: me returns 200 after login, logout returns
200, and me returns 401 afterwards. See docs/criteria.md for the user-reported
evidence; raw Postman exports were not supplied. The user subsequently confirmed
live protected CRUD, anonymous API denial, and all 43 direct Supabase RLS
assertions. In Postman, use No Auth:
login sets cookies, and Postman sends those cookies on subsequent requests to
localhost. No Bearer token is returned in the login JSON. Log in again after
logout. Browser frontend calls must still use credentials: "include".
