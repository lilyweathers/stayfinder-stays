# StayFinder criteria and verification plan

Target: all G1-G16 and all VG1-VG7. The assignment requires all G criteria and
at least four VG criteria for VG; this project's chosen scope includes all seven.
This document tracks implementation and verification. Checked milestones below
record completed work; a full criterion is checked only when all its requirements
and verification are complete.

Mark an item complete only after implementing it, verifying the whole criterion,
and recording the code location and test evidence. A passing mocked API test
does not prove that PostgreSQL permissions or constraints work.

## Current progress (2026-10-08)

- Backend: request-specific Supabase SSR clients, cookie sessions and token refresh,
  register/login/me/logout, credentialed CORS, and protected property writes and bookings.
- Supabase: Email and signups enabled, email confirmation enabled, Site URL set to
  http://localhost:3001. Basic RLS policies applied to properties and bookings.
- Mailtrap Email Sandbox configured for development confirmation emails.
- User-provided Postman responses demonstrate successful registration and login;
  email confirmation was also verified in the Supabase dashboard.
- Thirteen mocked API tests cover CRUD, auth cookies, anonymous denial, refresh,
  token forwarding to database requests, validation, and CORS.
- Frontend now includes public property list/detail pages, login, a booking form,
  a bookings list, shared API helpers, and request/response types. Registration,
  logout, session display, and browser persistence verification remain unfinished.
- The user confirmed
  the live Postman me/logout sequence passed and reports successful property and
  booking CRUD. Live anonymous API denial and public property reads are also
  user-confirmed. The user also reports all 43 direct Supabase RLS assertions passed.
- Basic RLS allows all authenticated users shared access. VG1 ownership and the
  other VG rules remain unfinished. No complete fullstack criterion is claimed here.

## Completed milestones

### Authentication (G1, G2, G14, G16)

- [x] Install and configure Supabase SSR with a client per request.
- [x] Type the Hono context with the Supabase client and authenticated user.
- [x] Add register, login, current-user, and logout endpoints.
- [x] Verify identity through getUser rather than trusting getSession.
- [x] Store sessions in HttpOnly cookies and write updated cookies during refresh.
- [x] Configure credentialed CORS for the frontend on localhost:3001.
- [x] Enable Email sign-in and registration in the hosted Supabase project.
- [x] Configure the frontend Site URL and retain email confirmation.
- [x] Configure Mailtrap Email Sandbox for development confirmation emails.
- [x] Verify live registration, email confirmation, and login through the dashboard
  and user-provided Postman responses.
- [x] Verify login cookies, me, logout cookie clearing, expired-token refresh,
  invalid-session denial, and user-token forwarding with automated mocked tests.
- [x] Verify live me and logout with recorded Postman results (user-confirmed
  sequence on 2026-10-06; see evidence log).
- [x] Add frontend registration/login/logout controls and session display.
- [ ] Verify the complete browser registration/login/logout flow and session display.
- [ ] Verify persistence after browser reload.

### Protected data (G6, G12, G15)

- [x] Require authentication for property POST, PUT, PATCH, and DELETE.
- [x] Keep property GET list and detail routes public.
- [x] Require authentication for every booking route.
- [x] Replace shared-client database calls with the request's Supabase client.
- [x] Save reproducible basic policies in database/001_auth_rls.sql.
- [x] Apply basic RLS policies and verify both tables have RLS enabled in Supabase.
- [x] Verify anonymous protected routes return 401 in automated mocked tests.
- [x] Verify authenticated property/booking CRUD and 404/database-error responses
  in automated mocked tests.
- [x] Verify real authenticated property and booking CRUD through API requests
  (user-confirmed Postman tests on 2026-10-06; see evidence log).
- [x] Verify anonymous denial through live API requests (user-confirmed Postman
  checks on 2026-10-06; see evidence log).
- [x] Verify direct Supabase reads/writes as anonymous and authenticated users
  (user reports all 43 Postman assertions passed on 2026-10-06).
- [ ] Add VG1 ownership: backend changes and SQL migration prepared; hosted database
  still uses shared-access policies until database/002_ownership.sql is applied and verified.
- [x] Derive property owner_id and booking guest_id from the authenticated API user.
- [x] Filter property mutations by owner_id and reject client-supplied ownership fields.
- [x] Prepare database ownership policies and immutable ownership triggers in
  database/002_ownership.sql, plus rollback-only direct database checks.
- [ ] Apply ownership SQL and backfill existing records to test@gmail.com as requested.
- [ ] Run direct ownership checks with host, guest A, guest B, and anonymous roles.

### Checks and supporting files

- [x] Backend TypeScript check passes.
- [x] All 13 backend automated tests pass (2026-10-08; Supabase responses mocked).
- [x] Frontend TypeScript and ESLint checks pass (2026-10-08).
- [x] Remove legacy property/booking JSON data and the unused JSON database helper;
  isolate response fixtures inside backend/tests/api.test.ts.
- [x] Add auth REST request examples in requests/auth.http.
- [x] Document dashboard, cookie, email, and Postman setup in docs/auth-setup.md.
- [x] Commit and push the auth foundation to the repository (commit 8b6a432).
- [ ] Complete submission requests covering all selected criteria, including VG denials.

### Frontend foundation (2026-10-08)

- [x] Add public property list and dynamic detail routes using the backend API.
- [x] Add reusable PropertyCard, PropertyList, and BookingForm components.
- [x] Add login form and credentialed API requests for backend session cookies.
- [x] Add bookings list with loading, error, empty, and sign-in states.
- [x] Add property, booking, and API response types and shared API helper.
- [x] Verify live backend properties match a direct read-only Supabase query:
  both returned the same six records; the user's frontend screenshots show them.
- [ ] Verify live property detail rendering and the complete browser login/booking flow.

## G checklist

| Complete | Criterion | Required result | Current progress and remaining verification |
| --- | --- | --- | --- |
| [ ] | G1 | Visitors can register, log in, and log out. | Frontend register/login forms and logout control implemented. User confirmed registration, Mailtrap email confirmation, and login for user@gmail.com. Live browser logout verification remains. |
| [ ] | G2 | Login survives reload; the app can identify the logged-in user. | Cookie sessions and current-user navigation implemented. Automated backend auth tests pass; frontend browser reload checks remain. |
| [ ] | G3 | Navigation changes for authenticated and anonymous visitors. | Navigation uses /auth/me to show bookings, email, and logout for signed-in users, or login/register for visitors. Full browser transition verification remains. |
| [ ] | G4 | Everyone can view the property list and individual details. | Public API and frontend list/detail routes implemented. Live list matches Supabase and is shown in user screenshots; live detail-page verification remains. |
| [ ] | G5 | Filter by location, maximum price, and guest count. | Not implemented: property list does not apply location, price, or guest filters. |
| [x] | G6 | Property writes require authentication in both API and database. | API guards and hosted basic RLS policies implemented. Live authenticated CRUD, anonymous API denial, and direct Supabase write restrictions confirmed by the user. Ownership is tracked under VG1. |
| [ ] | G7 | An authenticated user can create a property using a frontend form. | Not implemented: no frontend property form. |
| [ ] | G8 | Sort by ascending or descending price in the backend. | Not implemented: property list has no backend price sorting. |
| [ ] | G9 | Authenticated users can book from details; visitors are prompted to log in. | BookingForm implemented on the detail page with a sign-in prompt on 401. Backend booking creation verified earlier; complete browser flow remains unverified. |
| [ ] | G10 | Reject invalid bookings and show understandable form errors. | Backend Zod validates basic fields. Frontend validates date order and displays request errors; backend real calendar-date/date-order checks and detailed validation messages remain. |
| [ ] | G11 | Show nights and total price before submission. | Not implemented: no frontend nights/price preview. |
| [ ] | G12 | Authenticated users can view, change, and delete bookings for a property. | Protected API CRUD and frontend bookings list implemented. Frontend update/delete controls, property-specific filtering, live browser verification, and selected VG restrictions remain. |
| [ ] | G13 | Loading, fetch-error, and missing-property views exist. | Bookings loading/error states and property fetch-error messages implemented; detail route uses notFound() on 404. Property loading UI and live failure-state verification remain. |
| [ ] | G14 | API returns appropriate status codes. | Automated tests cover 200/201/400/401/403/404/409/500 cases. Complete live status-code verification and invalid-date coverage remain. |
| [x] | G15 | Database permissions protect tables independently of the API. | RLS enabled and eight basic policies applied and verified in the dashboard. All 43 direct Supabase assertions passed according to the user's Postman report, covering anonymous restrictions and authenticated CRUD. |
| [ ] | G16 | Backend and frontend data are typed. | Backend context/domain interfaces and frontend property/booking/API request-response types implemented; both TypeScript checks pass. Database response typing remains. |

## VG checklist: all seven selected

Each rule must remain effective when the frontend is bypassed. The planned API
behavior must be backed by database enforcement or database queries as appropriate.

| Done | Criterion | Planned location and reason | Verification to record |
| --- | --- | --- | --- |
| [ ] | VG1 Ownership | API derives ownership from verified identity, constrains property writes, and uses the user's token for booking RLS. database/002_ownership.sql replaces shared policies and prevents ownership/booking-property transfers. | 16 backend tests pass including forged-owner rejection and owner filters. Migration/backfill and database/tests/ownership.sql are prepared but not executed. Live guest isolation, host visibility, and direct SQL denials remain unverified. |
| [ ] | VG2 No overlapping bookings | API reports a clear conflict; database enforces overlap protection atomically so concurrent requests cannot both succeed. Pending and confirmed bookings block dates; cancelled bookings do not. | Overlapping create and update rejected; unchanged booking does not clash with itself; cancelled booking ignored; back-to-back stays allowed under the planned date convention; simultaneous overlapping writes yield one success. |
| [ ] | VG3 Capacity | API checks the property's current database capacity; database enforces the same rule on booking creation and updates. Client capacity values are never trusted. | Exactly max_guests allowed; max_guests + 1 rejected; use changed capacity; forged client capacity cannot bypass rule. |
| [ ] | VG4 Status and roles | API checks roles and translates failures; database enforces transitions and who can perform them. Only property owner confirms; guest or owner cancels. | pending -> confirmed by owner; pending/confirmed -> cancelled by guest or owner; guest confirmation denied; unrelated user denied; cancelled booking edits denied; confirmed -> pending denied. |
| [ ] | VG5 Time rules | API and database enforce the same calendar-date policy. Database checks writes independently. | Past check-in rejected; future booking allowed; booking with past check-in cannot be edited or cancelled; test date boundaries using a documented timezone. |
| [ ] | VG6 Server price | Backend calculates nights times current database price and persists total_price. Database guarantees the trusted saved value. Submitted client price is ignored. Existing bookings retain their saved price when the property price changes. | Forged client total is ignored rather than used; known total matches; property price change leaves existing booking total unchanged; direct database write cannot set arbitrary total. |
| [ ] | VG7 Available-date search | API validates dates and combines availability, filters, and sorting. Database query checks the requested interval against noncancelled bookings using the VG2 overlap convention. | Available/unavailable properties; cancelled booking ignored; adjacent stays; invalid or incomplete periods rejected; combined location/price/guests filters and both sort orders. |

## Design decisions to settle before implementation

These are proposed conventions, not extra requirements from the assignment.

- Use the existing location field rather than inventing separate city/country fields.
- Link properties and bookings to Supabase user IDs. Add ownership and saved-price
  fields through versioned SQL after inspecting the existing database.
- Keep authenticated user context when querying Supabase. A privileged client that
  bypasses row-level security must not substitute for user permission checks.
- Treat stays as [check_in, check_out): checkout day does not block the next guest.
  Require check_out > check_in and validate real calendar dates.
- Choose one timezone for "today" and document whether same-day check-in is allowed.
  The assignment forbids dates that have already passed; same-day behavior needs
  an explicit convention.
- Define price recalculation on booking date/property changes. Preserve saved totals
  on unrelated updates and on later property price changes.
- Reconcile G12 deletion with VG4/VG5: define who may delete a booking and when.
  A delete must not let users bypass cancelled-booking immutability or past-date
  restrictions. Keep deletion and cancellation as distinct operations.
- Define property deletion when bookings exist, and capacity reduction when an
  existing booking exceeds the new capacity. Document the chosen behavior.
- Keep frontend price calculations as previews; server/database values determine
  the saved booking price. Return understandable errors to the frontend.

## Suggested implementation order for later

1. Inspect existing schema and policies; save reproducible SQL under database/.
2. Establish authentication/session handling and types (G1-G3, G16).
3. Add ownership and API/database permissions (G6, G15, VG1).
4. Complete property reads, forms, filters, sorting, and fetch states (G4-G8, G13).
5. Add booking validation, permissions, management, and preview (G9-G12, G14).
6. Enforce overlap, capacity, status, time, and saved-price rules (VG2-VG6).
7. Add available-date search using the same interval rules (VG7).
8. Verify all rules through API calls, direct database requests, and frontend flows.

## Evidence log

### Frontend account controls - 2026-10-08

frontend/src/components/Navigation.tsx shows the current user's email and calls
POST /auth/logout; visitors see login/register links. frontend/src/app/register/page.tsx
validates password confirmation and handles Supabase email confirmation.
Frontend TypeScript and ESLint pass. The user confirmed signup for user@gmail.com,
finding its confirmation message in Mailtrap, and logging in. Browser logout and
reload persistence are not yet verified. The user reported shared booking access
before the ownership migrations were applied; hosted migration status remains unconfirmed.

### VG1 implementation prepared - 2026-10-08

Code: backend/src/routes/properties.ts, backend/src/routes/bookings.ts,
backend/tests/ownership.test.ts, database/002_ownership.sql,
database/003_assign_existing_ownership.sql, database/tests/ownership.sql.
The user selected test@gmail.com for existing ownership assignments.
All 16 backend mocked tests and both frontend/backend TypeScript checks passed.
Property owner and booking guest IDs are derived from the authenticated user;
strict validators reject forged ownership fields. Property mutations constrain
the owner. Booking visibility and participant mutations rely on the prepared
RLS policies using the verified user's token. PostgreSQL triggers block direct
identity/ownership changes and moving bookings to different properties.
Existing records are preserved, with backfill only for null ownership values.
Hosted migration and direct SQL tests have not been executed: this session has
no SQL connection to the project. VG1 remains unchecked until live verification.

### Frontend foundation and data-source verification - 2026-10-08

Code: frontend/src/app/properties/page.tsx, frontend/src/app/properties/[id]/page.tsx,
frontend/src/app/login/page.tsx, frontend/src/app/bookings/page.tsx,
frontend/src/components/, frontend/src/lib/api.ts, and frontend/src/types/.

Frontend `npm run typecheck` and `npm run lint` passed. Backend `npm test`
passed all 13 tests after legacy JSON removal; `npm run typecheck` also passed.
A read-only comparison of GET /properties and Supabase /rest/v1/properties
returned HTTP 200, six records each, and identical rows. User screenshots
confirm frontend list rendering. Supabase records were retained at the user's request.
Test fixtures remain isolated in the test suite and are not production fallbacks.

Live detail, browser authentication/persistence, and booking submission have not
been verified. A repeat live check before commit could not run because the local
servers were stopped (connection refused). These milestones do not complete
the corresponding full criteria.

Use test accounts: property owner, guest A, guest B, and anonymous visitor.
Keep real credentials and access tokens out of committed request files.
Use an isolated development database for write tests.

For each completed criterion, record:

| Criterion | Code/SQL paths | Successful case | Rejected/boundary case | Result/date | Explanation of rule location |
| --- | --- | --- | --- | --- | --- |
| G1 (partial) | backend/src/routes/auth.ts; docs/auth-setup.md | Live registration, confirmation, and login | Invalid login observed; validation covered by mocked tests | 2026-10-06: user-provided Postman responses and dashboard | Supabase Auth verifies credentials; backend handles cookies. Frontend remains. |
| G2 (partial) | backend/src/middleware/auth.ts; backend/tests/api.test.ts | Mocked login/me and token refresh | Mocked invalid session returns 401 | 2026-10-06: automated tests | Request client reads/writes cookies and verifies identity. Browser persistence remains. |
| G6/G15 | backend/src/routes/properties.ts; database/001_auth_rls.sql; requests/supabase-rls.postman_collection.json | Authenticated API and direct Supabase CRUD; public property reads | Anonymous API denial; direct Supabase insert denial and hidden/unchanged rows | 2026-10-06: dashboard checks and user-confirmed live tests; all 43 direct assertions passed | API guards protect Hono routes; PostgreSQL RLS enforces permissions when Hono is bypassed. VG ownership remains. |
| G12/G14 (partial) | backend/src/routes/bookings.ts; backend/tests/api.test.ts | Mocked authenticated CRUD | Mocked anonymous, missing, invalid, and duplicate cases | 2026-10-06: automated tests | Auth gates booking access; handlers return status codes. Frontend/live verification remain. |

### Live Postman session verification ? 2026-10-06

The user confirmed that the instructed three-request sequence worked. This is
user-reported evidence; raw response exports/screenshots were not supplied.
Requests used localhost:3000, Authorization: No Auth, no body, and Postman's
saved login cookies.

| Step | Request | Expected result confirmed by user |
| --- | --- | --- |
| 1 | GET /auth/me after login | 200 OK with the logged-in user |
| 2 | POST /auth/logout | 200 OK with { "message": "Logged out" } |
| 3 | GET /auth/me after logout | 401 Unauthorized with { "error": "Unauthorized" } |

This completes the live me/logout milestone. Frontend login/logout flows and
persistence after browser reload still need implementation and verification.
No passwords, tokens, or cookie values are recorded here.

### Live Postman CRUD verification - 2026-10-06

The user reports that property and booking list/detail, create, update, and delete
requests all work. The supplied screenshot shows the saved request names and
methods, but does not show response statuses, bodies, or Runner assertions.
This records user-reported successful CRUD, not an independently observed run of
requests/crud-auth.postman_collection.json. The authenticated CRUD milestone is
checked. Live anonymous denial was subsequently confirmed as recorded below.

The screenshot labels login and logout as GET. The implemented auth endpoints
use POST /auth/login and POST /auth/logout; saved request methods should match
those endpoints.

### Live Postman anonymous access verification - 2026-10-06

The user confirmed completion of the instructed checks after POST /auth/logout,
without logging in again, using No Auth and valid write bodies. This is
user-reported evidence; raw response exports were not supplied.

| Requests | Expected result confirmed by user |
| --- | --- |
| Property POST, PUT, PATCH, DELETE | 401 Unauthorized |
| Booking GET list/detail, POST, PUT, DELETE | 401 Unauthorized |
| Property GET list/detail | 200 OK |

This completes the live anonymous API denial milestone. Direct Supabase
permission checks were subsequently confirmed as recorded below.

### Direct Supabase RLS verification - 2026-10-06

The user reports all 43 assertions passed when running the 22-request collection
requests/supabase-rls.postman_collection.json with stored cookies disabled.
This is user-reported Runner evidence; a raw results export was not supplied.

The collection bypasses Hono and verifies public property reads, anonymous
booking reads returning no rows, anonymous inserts rejected with code 42501,
and anonymous updates/deletes affecting no rows. Authenticated reads confirm
those denied writes left the records unchanged. Authenticated creation,
updates with persisted values, and deletion are verified for both tables.
Temporary records are deleted and the direct test session is invalidated.

This completes the direct database permission milestone and G6/G15 under the
basic lecture policies. Per-user ownership restrictions under VG1 remain open.
No credentials or tokens are recorded here.

## Submission and oral review

- [x] Repository link covering backend and frontend: https://github.com/lilyweathers/stayfinder-stays
- [ ] Accurate list of fulfilled criteria with evidence above.
- [ ] API request file showing successful and rejected calls, including every VG rule.
- [ ] Database permission/constraint verification, beyond mocked API tests.
- [ ] Rehearse the app demonstration and explanations for the 8-10 minute review.

Be ready to explain authentication versus authorization, session cookies, why API
protection alone is insufficient, how direct calls are handled, and why each rule
belongs in the API, database, or both. Explain code in your own words before
claiming its criterion complete.
