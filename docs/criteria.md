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
  a bookings list, shared API helpers, and request/response types. Browser registration, login, logout, session display, and reload persistence
  were subsequently verified by the user on 2026-10-08.
- The user confirmed
  the live Postman me/logout sequence passed and reports successful property and
  booking CRUD. Live anonymous API denial and public property reads are also
  user-confirmed. The user also reports all 43 direct Supabase RLS assertions passed.
- Ownership policies are now active: the user confirmed the full direct database
  ownership test script passed without errors on 2026-10-08. Live property ownership and host booking-list authorization were subsequently
  verified with both real accounts; remaining VG1 cases and other VG rules are unfinished.

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
- [x] Verify the complete browser registration/login/logout flow and session display
  (user-confirmed browser checks on 2026-10-08; see evidence log).
- [x] Verify persistence after browser reload
  (user-confirmed browser reload and authenticated Bookings access on 2026-10-08).

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
- [x] Add VG1 ownership implementation and verify hosted database policies
  (user-confirmed full ownership.sql run without errors on 2026-10-08).
- [x] Derive property owner_id and booking guest_id from the authenticated API user.
- [x] Filter property mutations by owner_id and reject client-supplied ownership fields.
- [x] Prepare database ownership policies and immutable ownership triggers in
  database/002_ownership.sql, plus rollback-only direct database checks.
- [x] Apply ownership policies (verified by the user-reported passing database checks).
- [x] Verify existing-record backfill to test@gmail.com (user-confirmed 2026-10-08).
  Public API reads showed six assigned original properties; the supplied SQL
  screenshot shows four bookings assigned to test@gmail.com. The user confirmed
  the follow-up summary query worked after being given the expected counts.
- [x] Run direct ownership checks with host, guest A, guest B, and anonymous roles
  (user-confirmed 2026-10-08; entire script completed without errors).
- [x] Verify ownership through live API/browser requests with both real accounts
  (2026-10-08: user-reported browser separation and supplied Bash responses;
  property PATCH denied for guest and allowed for host; host booking-list access
  denied for guest and allowed for host).
- [x] Apply database/005_assign_properties_to_host.sql and verify all six original
  properties are owned by host@gmail.com (user-confirmed 2026-10-08).
  The script requires exactly six matched properties and stores auth.users.id
  as owner_id; its final query displays the account email for verification.
  Booking guest assignments stay unchanged.

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

- [x] Add owner property deletion with explicit confirmation and an atomic
  database function that preserves history and cancels upcoming active bookings.
- [x] Apply database/007_property_deletion.sql and run database/tests/property_deletion.sql
  (user-confirmed successful application and passing test on 2026-10-08).
- [x] Verify property creation/editing/deletion and automatic cancellation in the browser
  (user-confirmed working browser flow on 2026-10-08).

- [x] Add My Properties navigation and owned-property listing with management routes.
- [x] Add owner property editing and related-booking edit/confirm/cancel controls.
- [x] Add host-only confirmation API with conditional pending-status updates;
  all 21 backend tests pass, including confirmation permissions/conflicts
  and password-confirmed account deletion.
- [x] Apply database/006_booking_status_roles.sql and run database/tests/status_roles.sql
  (user-confirmed successful application and passing test on 2026-10-08).
- [x] Verify My Properties management and pending-booking actions in the browser
  (user-confirmed working browser flow on 2026-10-08).

- [x] Add booking cancellation confirmation, pending/error/success feedback, and
  local status updates through POST /bookings/:id/cancel.
- [x] Add API cancellation ownership, status, and check-in guards with conditional updates.
- [x] Apply database/004_booking_cancellation.sql (user-confirmed 2026-10-08).
- [x] Verify direct database cancellation rules with database/tests/cancellation.sql
  (user-confirmed passing run on 2026-10-08).

- [x] Add public property list and dynamic detail routes using the backend API.
- [x] Add reusable PropertyCard, PropertyList, and BookingForm components.
- [x] Add login form and credentialed API requests for backend session cookies.
- [x] Add bookings list with loading, error, empty, and sign-in states.
- [x] Show retained bookings for deleted properties by default, with saved titles
  when available and no broken property link.
- [x] Apply database/011_permanent_property_deletion.sql and run user_deletion.sql
  to verify owned property removal, retained bookings/titles, upcoming cancellation,
  preserved past bookings, and guest access (user reports PASS on 2026-10-08;
  fixtures rolled back).
- [x] Run database/tests/property_deletion.sql after 011 to verify the updated
  Manage property deletion RPC and booking retention independently
  (user-confirmed passing test after migration 011 on 2026-10-08).
- [x] Add authenticated Profile page with account details and password-confirmed
  deletion. The backend verifies the password and deletes only the current user.
- [x] Configure backend-only SUPABASE_ADMIN_KEY and verify profile/account deletion
  with a temporary account in the browser (user-confirmed 2026-10-08).
- [x] Apply database/010_user_deletion.sql and run database/tests/user_deletion.sql
  to verify account deletion archives owned properties and cancels upcoming bookings
  (user reports the database test passed on 2026-10-08; fixtures rolled back;
  soft deletion subsequently superseded by migration 011).
- [x] Separate guest Bookings from host management: the API filters guest lists by
  the signed-in UID and verifies property ownership for host booking lists.
  Covered by mocked API tests; live account separation remains to be verified.
- [x] Apply database/008_booking_access.sql and verify unrelated accounts cannot
  read bookings directly in Supabase
  (user-confirmed migration application and supplied passing direct read test
  on 2026-10-08; see evidence log).
- [x] Run database/009_assign_current_bookings_to_test.sql once to assign all
  currently existing bookings to test@gmail.com; verify its returned guest UIDs
  (user-confirmed completion and returned guest UID verification on 2026-10-08).
- [x] Add property, booking, and API response types and shared API helper.
- [x] Verify live backend properties match a direct read-only Supabase query:
  both returned the same six records; the user's frontend screenshots show them.
- [x] Verify live property detail rendering and the complete browser login/booking flow
  (user-confirmed detail display, signed-out prompt, login, successful booking,
  and correct property/dates/guest count in Bookings on 2026-10-08).

## G checklist

| Complete | Criterion | Required result | Current progress and remaining verification |
| --- | --- | --- | --- |
| [x] | G1 | Visitors can register, log in, and log out. | Browser registration, confirmation/login sequence, session display, and logout verified by user reports on 2026-10-08. After logout, Bookings prompts sign-in. |
| [x] | G2 | Login survives reload; the app can identify the logged-in user. | Cookie sessions and current-user navigation implemented. Automated backend auth tests pass; user confirmed email and Logout remain after Ctrl+R and Bookings loads without a sign-in prompt on 2026-10-08. |
| [x] | G3 | Navigation changes for authenticated and anonymous visitors. | User confirmed signed-in email and Logout, followed by email removal and Login/Register returning after logout on 2026-10-08. Signed-out Bookings displays a sign-in prompt. |
| [x] | G4 | Everyone can view the property list and individual details. | Public list/detail API reads verified earlier; browser list matches Supabase and is shown in user screenshots. On 2026-10-08, the user supplied the logged-out Gothenburg Harbor Loft detail view with title, location, description, nightly price, and guest capacity. |
| [x] | G5 | Filter by location, maximum price, and guest count. | Implemented GET /properties location/max_price/guests filters with query validation and database filtering; frontend GET form retains URL values and supports clearing/empty results. All 24 backend tests and frontend type/lint checks pass. Live individual/combined API filters and server-rendered controls verified on 2026-10-08; user confirmed browser Apply filters and Clear filters work on 2026-10-08. |
| [x] | G6 | Property writes require authentication in both API and database. | API guards and hosted basic RLS policies implemented. Live authenticated CRUD, anonymous API denial, and direct Supabase write restrictions confirmed by the user. Ownership is tracked under VG1. |
| [x] | G7 | An authenticated user can create a property using a frontend form. | Create new property form added to My Properties with validation, pending/error/success feedback, and POST /properties. Backend assigns the signed-in user's owner_id. User confirmed creating a temporary account and property during the live account-deletion check on 2026-10-08. |
| [x] | G8 | Sort by ascending or descending price in the backend. | GET /properties accepts sort=asc or sort=desc, validated and applied through Supabase database ordering by price_per_night with property_id as a stable tie-breaker. Live API checks passed in both directions with and without filters on 2026-10-08. All 26 backend tests and frontend TypeScript/ESLint checks pass; property-list sort dropdown implemented. |
| [ ] | G9 | Authenticated users can book from details; visitors are prompted to log in. | BookingForm implemented on the detail page with a sign-in prompt on 401. Backend booking creation verified earlier; complete browser flow remains unverified. |
| [ ] | G10 | Reject invalid bookings and show understandable form errors. | Backend Zod validates basic fields. Frontend validates date order and displays request errors; backend real calendar-date/date-order checks and detailed validation messages remain. |
| [ ] | G11 | Show nights and total price before submission. | Not implemented: no frontend nights/price preview. |
| [ ] | G12 | Authenticated users can view, change, and delete bookings for a property. | My Properties lists owned properties and links to management pages with related bookings, property/booking editing, and confirm/cancel actions. Property editing uses PATCH; booking editing preserves status/identity. Frontend deletion and live browser verification remain. |
| [ ] | G13 | Loading, fetch-error, and missing-property views exist. | Bookings loading/error states and property fetch-error messages implemented; detail route uses notFound() on 404. Property loading UI and live failure-state verification remain. |
| [ ] | G14 | API returns appropriate status codes. | Automated tests cover 200/201/400/401/403/404/409/500 cases. Complete live status-code verification and invalid-date coverage remain. |
| [x] | G15 | Database permissions protect tables independently of the API. | RLS enabled and eight basic policies applied and verified in the dashboard. All 43 direct Supabase assertions passed according to the user's Postman report, covering anonymous restrictions and authenticated CRUD. |
| [ ] | G16 | Backend and frontend data are typed. | Backend context/domain interfaces and frontend property/booking/API request-response types implemented; both TypeScript checks pass. Database response typing remains. |

## VG checklist: all seven selected

Each rule must remain effective when the frontend is bypassed. The planned API
behavior must be backed by database enforcement or database queries as appropriate.

| Done | Criterion | Planned location and reason | Verification to record |
| --- | --- | --- | --- |
| [ ] | VG1 Ownership | API derives ownership from verified identity, constrains property writes, and uses the user's token for booking RLS. database/002_ownership.sql replaces shared policies and prevents ownership/booking-property transfers. | Automated API ownership checks pass. User confirmed entire database/tests/ownership.sql passed on 2026-10-08, covering guest isolation, host visibility, nonowner mutations, and spoofed ownership. Existing-record backfill verified with supplied booking screenshot and user-confirmed summary query. Live browser account separation, guest property PATCH denial (404), host property PATCH success (200), and guest/host property-booking list authorization (403/200) verified on 2026-10-08. Live creation ownership assignment, booking mutation permissions, and unrelated-user booking isolation remain unverified. |
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

### Booking cancellation implementation - 2026-10-08

frontend/src/components/CancelBookingButton.tsx and frontend/src/app/bookings/page.tsx
provide explicit cancellation confirmation and error/success feedback.
POST /bookings/:id/cancel checks the guest/host role, pending/confirmed status,
and check-in date, then conditionally updates only status to cancelled.
Same-day cancellation is allowed; the date boundary uses Europe/Stockholm.
The record is retained. All 17 backend mocked tests pass, including guest/host
success, unrelated-user denial, past/cancelled/missing bookings, and a concurrent
change. Frontend typecheck and lint pass. database/004_booking_cancellation.sql
was applied according to the user on 2026-10-08. The user also confirmed that the
entire database/tests/cancellation.sql script passed on 2026-10-08. This is
user-reported evidence; a raw result export was not supplied. The direct database
checks cover guest/host cancellation, unrelated-user denial, cancelled-booking
reopen/delete denial, and past-booking cancellation/date-change denial. Test
records were rolled back by the script.
Live browser cancellation remains unverified. VG4/VG5 remain incomplete, including
confirmation permissions and create-time date enforcement.

### Frontend account controls - 2026-10-08

frontend/src/components/Navigation.tsx shows the current user's email and calls
POST /auth/logout; visitors see login/register links. frontend/src/app/register/page.tsx
validates password confirmation and handles Supabase email confirmation.
Frontend TypeScript and ESLint pass. The user confirmed signup for user@gmail.com,
finding its confirmation message in Mailtrap, and logging in. Browser logout and
reload persistence are not yet verified. The user reported shared booking access
before the ownership migrations were applied; the user subsequently confirmed
the direct database ownership checks passed as recorded below.

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
The user subsequently confirmed the entire database/tests/ownership.sql script
completed without errors on 2026-10-08, including RESET ROLE and ROLLBACK. The
displayed {"role":"anon"} was the final set_config result, not an error.
This is user-reported evidence; the test checks guest isolation, host visibility,
nonowner update/delete denial, spoofed ownership denial, immutable ownership,
and anonymous property/booking visibility. Test records were rolled back.
Existing-record backfill was subsequently verified using database/tests/backfill.sql:
the supplied screenshot shows all four bookings and their properties assigned to
test@gmail.com. The user confirmed the summary query worked after being given
expected counts of 1 matching account, 6 original properties found/assigned,
0 unassigned properties, 4 total bookings/assigned, and 0 unassigned bookings.
The summary result itself was not supplied as an export or screenshot.
VG1 remains unchecked pending live creation ownership assignment, booking mutation permissions, and unrelated-user booking isolation checks.

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

### Live two-account ownership verification - 2026-10-08

Browser observations are user-reported. API evidence consists of the user-supplied
Bash response status lines and bodies, using separate sequential logins and a
local cookie jar. No credentials or cookie values are recorded.

Property tested: `dcd91068-9f88-496f-a239-305f54fdc957` (Gothenburg Harbor Loft).
PATCH requests submitted the existing title, preserving its value.

| Account | Check | Observed result |
| --- | --- | --- |
| host@gmail.com | Browser My Properties | User confirmed six assigned properties visible. |
| test@gmail.com | Browser My Properties / Bookings | No owned properties; five bookings visible. This alone does not prove every booking belongs to the account. |
| test@gmail.com | PATCH /properties/:id with valid title | 404, Property not found. |
| test@gmail.com | GET /bookings?property_id=:id | 403, Only the property owner can view all bookings for this property. |
| host@gmail.com | GET /bookings?property_id=:id | 200, empty array. Authorized access verified; visibility of actual related bookings was not exercised. |
| host@gmail.com | PATCH /properties/:id with existing title | 200, property object with owner_id eafefb3f-95e9-4cb9-b14f-06a57ecea0c5. |

Initial Bash requests using the Git Bash node wrapper failed with malformed JSON
(400) after stdin is not a tty. They are not ownership evidence; the valid
requests above used node.exe. The selected live two-account milestone is
complete within this documented scope; full VG1 remains unchecked for the
additional cases described in its criterion row.

### Complete browser authentication flow - 2026-10-08

User-reported browser verification at http://localhost:3001, guided through
registration, confirmation if required, login, session display, and logout.
No screenshots, network exports, credentials, or session cookies were supplied.

- User confirmed the initial signed-out navigation and new-account registration worked.
- User confirmed the instructed confirmation/login sequence worked and navigation
  displayed the signed-in email and Logout. Email confirmation was conditional in
  the instructions; no separate confirmation response was supplied in this run.
- User confirmed Logout removed the email and restored Login/Register.
- User supplied the signed-out Bookings text: Sign in to view bookings, with a
  Sign in link to http://localhost:3001/login.

This completes the browser registration/login/logout and session-display milestone,
G1, and G3 on user-reported evidence. Browser reload persistence was not exercised;
its milestone and G2 remain unchecked. Earlier evidence-log entries describe
historical verification status and are superseded by this entry for this flow.

### Browser session persistence - 2026-10-08

At http://localhost:3001, the user confirmed the complete instructed sequence:
login, verify the account email and Logout in navigation, reload with Ctrl+R,
verify both remain visible, and open Bookings without a sign-in prompt.
This is user-reported evidence; no screenshots or network exports were supplied.

The reload-persistence milestone and G2 are complete. Earlier evidence entries
that list browser reload persistence as pending describe historical status and
are superseded by this result. This check covers a normal page reload; it does
not independently verify browser restart persistence or long-term token expiry.

### Direct Supabase unrelated-account booking read - 2026-10-08

The user reported applying database/008_booking_access.sql successfully. A Bash
script then signed in to Supabase directly with the configured SUPABASE_KEY
from backend/.env and each account password. No admin key or Hono API was used.
The supplied output confirms:

- test@gmail.com: HTTP 200 and an accessible owned booking,
  a8de3760-3cdd-48c3-b5a5-4dbac5bd8b6d (query filtered by the authenticated guest UID).
- user@gmail.com: HTTP 200 with [] when selecting the same booking by ID.
- Script result: PASS, unrelated account cannot read the existing booking.

This verifies the direct booking-read restriction for the tested unrelated
account against a known existing row. Evidence is user-supplied terminal output;
no passwords, keys, or tokens are recorded. This read test does not verify
booking mutation permissions or every remaining VG1 case.

### Live property detail and browser login/booking flow - 2026-10-08

User supplied the rendered Gothenburg Harbor Loft details: Gothenburg, Sweden;
its description; 1200 per night; and capacity of four guests. While signed out,
the booking section displayed a sign-in prompt and a denied submission returned
Unauthorized. The user subsequently confirmed authenticated booking submission,
success feedback, and the new booking in Bookings with the correct property,
dates, and guest count. This completes the selected milestone on user-reported
evidence; no network exports or booking ID were supplied for this browser run.

During verification, the unconditional booking sign-in message was changed in
frontend/src/components/BookingForm.tsx to depend on the current-user check
returning 401; frontend route type generation, TypeScript, and ESLint passed.
A separate browser confirmation of that message fix was not explicitly supplied.
Earlier entries listing this browser flow as unverified describe historical status
and are superseded by this evidence.

### Booking sign-in return and draft restoration - 2026-10-08

The user confirmed the updated single-button flow works in the browser: Sign in
when logged out preserves entered booking fields, returns to the same property
after login, and restores the draft. The signed-in button creates the booking.
Drafts use per-property sessionStorage in the current tab and clear on successful
creation. Login return destinations are restricted to same-origin property paths.
Frontend TypeScript and ESLint checks passed. This confirmation supersedes the
earlier note that browser confirmation of the sign-in message fix was pending.

### Property filters implementation and live checks (G5) - 2026-10-08

Code: backend/src/validators/propertyFilterValidator.ts, backend/src/routes/properties.ts,
backend/tests/property-filters.test.ts, frontend/src/app/properties/page.tsx,
frontend/src/lib/api.ts, frontend/src/types/property.ts, and PropertyList.tsx.
Location uses a case-insensitive substring match; max_price uses inclusive nightly
price <= maximum, and guests uses capacity >= requested guests. Filters combine
with AND and always exclude deleted properties. Blank filters are ignored.
Invalid non-numeric/negative prices and non-positive/fractional guest counts
return 400 with validation details. No database migration is required.

Independent live read-only API checks compared returned IDs against the six
existing properties: Gothenburg returned one, max_price=1200 returned five,
guests=4 returned four, and their combination returned Gothenburg Harbor Loft.
A nonexistent location and max_price=0 returned no rows; blank filters returned
all six. max_price=-1 and guests=1.5 returned 400. The filtered frontend URL
returned 200 with all three form fields and the matching Harbor Loft rendered.
All 24 backend tests passed; frontend route generation, TypeScript, and ESLint
passed. The user subsequently confirmed browser Apply filters and Clear filters work;
G5 is complete on the combined automated, live API, and user-reported browser evidence.

### G5 browser filter verification - 2026-10-08

The user confirmed the instructed browser checks worked: applying location
Gothenburg, maximum nightly price 1200, and four guests shows Gothenburg Harbor
Loft; Clear filters restores all six properties. This is user-reported evidence
and completes G5 alongside the previously recorded live API and automated checks.

### Backend price sorting (G8) - 2026-10-08

GET /properties?sort=asc or sort=desc sorts in PostgreSQL through the Supabase
query, not in browser JavaScript. Equal prices use property_id ascending for
a stable order. Omitted/blank sort retains the existing default order, while
unsupported sort values return 400 before a database request. Existing filters
combine with sorting. Frontend controls submit the sort value alongside filters
and retain it in the URL. No database migration is required.

Independent live API checks returned prices 850, 900, 950, 1100, 1200, 1800
ascending and the reverse descending. With location=Sweden, max_price=1200,
and guests=2, both directions returned the five matching properties in the
expected order. Invalid sort returned 400. The frontend sort URL rendered 200
with the dropdown and both choices. All 26 backend tests passed, including
database-order forwarding, combined filters, default order, and invalid-sort
denial. Frontend route type generation, TypeScript, and ESLint passed. G8 is
complete based on backend implementation and live API evidence. The user also
confirmed both browser sort choices work on 2026-10-08.
