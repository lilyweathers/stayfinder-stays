# StayFinder verification history

Historical implementation milestones and verification records, preserved from criteria.md.
Later results supersede earlier pending-status notes. For current completion status, see [criteria.md](criteria.md).
Mocked API tests, direct database checks, and user-reported browser checks are distinct evidence sources.

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
VG1 remains unchecked pending live creation ownership assignment, booking mutation permissions, and unrelated-user API booking isolation checks. The later direct Supabase unrelated-account read check below verifies database read isolation for the tested existing booking.

### VG1 automated coverage and live runner - 2026-10-09

Added API regression checks proving creation uses the Auth-verified user rather
than the cached session identity, and that all single-booking routes return 404
for RLS-hidden rows while forwarding the user's token. All 48 backend tests and
the backend TypeScript check pass. These tests mock Supabase responses.

Prepared backend/scripts/verify-ownership-live.mjs and requests/ownership-live.md
for the remaining hosted checks using two distinct accounts, separate cookies,
and disposable fixtures. The runner's syntax check passes. The hosted run
subsequently passed as recorded below, completing the pending VG1 verification.

### VG1 hosted API ownership verification - 2026-10-09

Ran `node --import tsx scripts/verify-ownership-live.mjs` from backend against
the configured hosted Supabase project. The runner served the current Hono source
on an ephemeral loopback port and used actual HTTP requests, two confirmed test
accounts, separate cookie stores, and the normal publishable/anon key. No mocked
database or admin client was used. The sandboxed attempt failed at login before
any writes; the approved network-enabled run passed all 36 HTTP checks.

- Property/booking creation returned 201 and owner_id/guest_id matched each
  account's verified /auth/me identity.
- Spoofed ownership fields returned 400. Nonowner property PATCH returned 404;
  owner PATCH returned 200. Guest/host property booking lists returned 403/200.
- Guest and host booking edits returned 200, preserving guest identity. Guest
  confirmation returned 403; host confirmation returned 200. Guest and host
  cancellation returned 200. Participant deletion succeeded.
- On a second property owned by the guest account, the other account was
  unrelated to both property and booking. Its list excluded the booking even
  with a spoofed guest_id query, its property-booking list returned 403, and
  single-record GET, PUT, DELETE, confirm, and cancel returned 404.
- Participant reads before and after the denied mutations were identical.
  Moving the booking to the first property returned 403 and left it unchanged.
- All three disposable bookings and both properties were deleted; the runner
  reported cleanup complete and exited successfully. Existing records were
  not modified. These are API/database checks, not additional browser evidence.

Credentials were moved from requests/ownership-live.md into the gitignored
requests/local/ownership-accounts.json, and documentation placeholders restored.
Together with the earlier direct database and browser evidence and the passing
48-test backend suite, this completes VG1. Earlier pending VG1 notes are superseded.

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

### Booking input validation implementation (G10) - 2026-10-08

backend/src/validators/bookingValidator.ts validates actual calendar dates by
round-tripping UTC date strings and requires checkout strictly after check-in.
Leap days are accepted only in leap years; year 0000, invalid months/days,
timestamps, and non-YYYY-MM-DD formats are rejected. Name/property fields are
trimmed and required; email is trimmed/validated; guests must be a positive safe
integer. POST and PUT share the schema and return 400 with field paths/messages
before database writes. backend/tests/booking-validation.test.ts covers 17
invalid cases on both routes, and a valid leap-day booking.

frontend/src/lib/booking-validation.ts is shared by create/edit forms and
provides explicit name, email, date, order, whole-number, and displayed-capacity
errors. Inputs remain filled after failure. Backend validation messages already
flow through the API helper. All 28 backend tests passed; frontend validation
checks, route generation, TypeScript, and ESLint passed. Browser invalid-input
verification remains pending; G10 is unchecked until confirmed.

This work does not complete VG3: displayed-capacity checks are frontend only;
trusted API/database capacity enforcement remains to implement under VG3.
Past-date restrictions remain tracked under VG5.

### G10 past-date follow-up - 2026-10-08

The user confirmed the date-order, missing/invalid name/email, and displayed guest
capacity browser checks worked, but reported that past dates were still bookable.
API create/update and shared frontend form validation now reject check-in before
the current Europe/Stockholm calendar date; same-day check-in is allowed. Create
form date inputs also expose today as their minimum. All 29 backend tests and
frontend TypeScript/ESLint checks passed. The additional invalid-request case
verifies past dates return 400 before database writes on both POST and PUT.
The user subsequently confirmed the browser date picker disables past dates;
G10 is complete with the previously confirmed invalid-form checks and passing
API validation tests. A manually entered past-date browser error was not
exercised because the picker prevented selection.
Direct database time-rule enforcement remains unfinished under VG5.

### G10 completed browser verification - 2026-10-08

The user confirmed past dates are greyed out and cannot be selected in the
browser booking form. Earlier browser confirmation covered invalid date order,
name/email, and displayed-capacity errors. Combined with the 29 passing backend
tests (including manually submitted past dates rejected before writes), this
completes G10. Historical pending-verification notes in this log are superseded
by this entry. VG3 database capacity and VG5 direct database time rules remain
separate unfinished criteria.

### Booking nights and estimated total preview (G11) - 2026-10-08

BookingForm.tsx displays nights, nightly price, and estimated total above its
submit/sign-in button. calculateBookingPreview in frontend/src/lib/booking-validation.ts
uses UTC calendar-day differences to avoid daylight-saving off-by-one errors and
rounds the displayed total to two decimal places. Missing/impossible/reversed/equal
dates do not produce a price. Restored login drafts recalculate the preview;
successful creation resets it. No client total is submitted to the API. Trusted
saved pricing is still tracked separately under VG6.

Calculation checks passed for two nights at 1200 (2400), a single night, a leap
day, year boundary, both daylight-saving boundaries, decimal prices, and invalid
dates. Frontend route type generation, TypeScript, and ESLint passed. The live
property page returned 200 with the initial preview prompt. The user subsequently confirmed the browser preview works: October 10–12,
2026 at Harbor Loft shows two nights at 1,200 and estimated total 2,400
before submission. G11 is complete on calculation and user-reported browser
evidence.

### Individual booking deletion implementation (G12) - 2026-10-08

frontend/src/components/DeleteBookingButton.tsx adds permanent deletion with
explicit confirmation in PropertyOwnerPanel. Successful deletion removes the
row from the list and shows Booking deleted; failures preserve the row and show
an error. Only pending/confirmed bookings with valid current/future check-in
dates expose deletion controls.

DELETE /bookings/:id reads under participant RLS, verifies guest or property
owner identity, checks status/calendar date, and deletes with conditional status
and date filters. Hidden/missing rows return 404, ownership violations 403, and
blocked/changed bookings 409. Existing 002/008 RLS and the 004 cancellation
trigger enforce ownership and past/cancelled deletion restrictions independently
of the API; no new migration is required. Historical bookings remain protected.

All 30 backend tests passed, including guest/host success, unrelated/anonymous
denial, past/cancelled/invalid dates, missing rows, race conflicts and database
denial translation. Frontend route generation, TypeScript, and ESLint passed.
The user subsequently confirmed the instructed browser deletion check passed:
confirmation deletes the disposable future booking, removes it from the list,
and shows Booking deleted. Alongside previously verified viewing/editing and
the passing permission tests, this completes G12 on user-reported browser evidence.

### Property loading, error, and missing views (G13) - 2026-10-08

Added frontend/src/app/properties/loading.tsx and [id]/loading.tsx with
accessible status text and busy containers. Added [id]/not-found.tsx with
Property not found, an explanation, and Browse properties navigation. Detail
fetch errors offer Try again and Browse properties; list errors preserve filter
controls and explain how to retry/clear filters.

Live localhost:3001 HTTP rendering for the absent UUID
00000000-0000-4000-8000-000000000000 contained the detail loading fallback and
friendly not-found output. An isolated copy of the frontend on port 3002,
configured to an unavailable API, returned the list/detail loading fallback,
fetch-error messages, and recovery actions. The temporary server was stopped;
the user app and backend were not stopped or reconfigured. These are independently
observed server-rendered/streamed HTTP checks, not browser screenshot evidence.
Next.js streamed responses may return HTTP 200 while rendering not-found UI;
the backend still returns 404 for a missing property. Frontend route generation,
TypeScript, and ESLint passed. G13 is complete.

### API HTTP status verification (G14) - 2026-10-08

An isolated instance of the compiled current Hono API and a local simulated
Supabase HTTP server ran on ephemeral loopback ports. Node fetch made actual
HTTP requests to Hono; neither app.request nor a global fetch override was used.
Auth used a synthetic test session verified by the simulated Auth endpoint.
No hosted Supabase data or real account sessions were used. Both servers closed
after the checks. This verifies real HTTP transport and API behavior with
controlled dependencies; it is not additional hosted-database evidence.

| Check | Observed status/result |
| --- | --- |
| GET / | 200, StayFinder API |
| POST /bookings with valid future input | 201, created booking with verified test guest ID and pending status |
| POST /bookings with February 30 | 400, check_in field path and real-calendar-date message |
| GET /bookings without session | 401, Unauthorized |
| POST /properties with disallowed Origin | 403, Origin not allowed |
| GET /bookings/missing-booking | 404, Booking not found |
| DELETE /bookings/cancelled-booking | 409, Cancelled bookings cannot be deleted |
| GET /properties with simulated database failure | 500, generic Failed to read properties message |

All eight HTTP assertions passed. Together with the 30 passing backend tests
and previously recorded real-account/browser evidence, this completes G14.
The initial note requiring complete live status verification is superseded
by this explicitly scoped HTTP evidence; no claim is made that every status
was induced against the hosted project.

### Host deletion of cancelled bookings - 2026-10-08

At the user request, management now shows Delete booking for cancelled bookings
with valid current/future check-in. API deletion verifies current property
ownership even when the user is also the guest. Nonowner guest deletion is 403;
past deletion remains 409. Migration 012 updates the database trigger to permit
the same host-only exception while keeping cancelled rows immutable for edits.
Earlier blanket cancelled-deletion evidence describes the previous behavior.
All 30 backend tests and frontend type/lint checks passed. The user subsequently confirmed the instructed migration, rollback database
checks, and browser deletion sequence works on 2026-10-08. This is user-reported
evidence; raw SQL results and browser response exports were not supplied.

- [x] Apply database/012_host_cancelled_booking_deletion.sql.
  (user-confirmed passing instructed sequence on 2026-10-08).
- [x] Run database/tests/host_cancelled_booking_deletion.sql.
  (user-confirmed passing instructed sequence on 2026-10-08).
- [x] Verify host deletion of a current/future cancelled booking in the browser.
  (user-confirmed passing instructed sequence on 2026-10-08).

### Database response typing (G16) - 2026-10-08

backend/src/types/database.ts defines the application-facing public schema after
migrations 001–012, including Row/Insert/Update types for properties/bookings,
nullable owner/guest references and historical property titles, booking status
values, and delete_property arguments/nullable result. Request SSR clients and
auth verifier/admin clients use Database generics. Hono context retains the
exact typed SSR client return type to match its installed SDK dependency.
Database types are manually maintained from repository SQL and application fields,
not generated from the hosted database; update them when the schema changes.

backend/tests/database-types.ts provides compile-only assertions for inferred
query/RPC responses and rejects unknown tables/functions, string prices, invalid
statuses, missing insert fields, and wrong RPC argument types. No database
requests are made by these assertions. Backend source/test compilation, all
30 runtime backend tests, frontend route type generation, TypeScript, and
ESLint passed. G16 is complete. No database migration or browser action is
needed for this typing change.

### VG2 overlap implementation prepared - 2026-10-09

Code: backend/src/routes/bookings.ts, backend/tests/booking-overlap.test.ts,
database/019_booking_overlap.sql, database/tests/overlap_preflight.sql,
database/tests/overlap.sql, backend/scripts/verify-overlap-live.mjs, and
requests/overlap-live.md.

The API translates PostgreSQL exclusion violations (23P01) into HTTP 409 with
clear date-conflict feedback and does not disclose conflicting booking details.
It delegates detection to the database so another guest's RLS-hidden booking
cannot bypass the rule. The prepared migration normalizes the date columns to
native dates, rejects invalid intervals, and adds a GiST exclusion constraint
on property_id plus [check_in, check_out) for pending/confirmed bookings only.
Checkout is exclusive; cancelled bookings do not block dates. Existing invalid
or overlapping records abort migration without automatic edits/deletions.

All 49 backend tests pass, including create/update 409 translation and privacy
assertions; backend TypeScript and live-runner syntax checks pass. These API
tests mock Supabase. Local database execution was unavailable because Docker's
daemon is not running. Hosted migration application, rollback-only SQL cases,
and the live runner have not yet run; VG2 remains unchecked.

The live runner uses the existing ignored VG1 test-account file, actual HTTP
requests, separate account cookies, and the normal publishable/anon key. It
checks overlap shapes, hidden blockers, adjacent/unchanged dates, status behavior,
different properties, failed-update persistence, and simultaneous creates via
both Hono and direct Supabase. Each race must persist exactly one active booking.
Only disposable records created during the run are cleaned up.

### VG2 hosted verification complete - 2026-10-09

The user confirmed the requested preflight, migration 019, and rollback-only
database tests passed. This is user-reported SQL evidence; no SQL export was
supplied. The earlier pending notes are superseded by this and the live run below.

Ran backend/scripts/verify-overlap-live.mjs against the configured hosted Supabase
project using the current Hono source on an ephemeral loopback port, actual HTTP
requests, two distinct verified accounts, and the normal publishable/anon key.
No mocked database or admin client was used. All 31 live checks passed:

- Exact, contained, enclosing, and both edge overlaps against an RLS-hidden
  pending booking returned API HTTP 409 with the clear conflict message.
- Adjacent stays on both boundaries returned 201; unchanged booking dates
  updated successfully with 200. Identical dates on another property were allowed.
- Overlapping API updates returned 409; direct Supabase updates returned
  400/23P01. The participant's stored row was identical before/after denied writes.
- Confirmed bookings blocked dates; cancellation freed the same dates.
- Simultaneous API creates returned one 201 and one 409. Simultaneous direct
  Supabase creates returned one 201 and one 400/23P01. Host reads verified exactly
  one active booking persisted for each tested race.
- All disposable bookings/properties were cleaned up; the runner exited zero.
  Existing properties/bookings were not modified.

The first live attempt stopped because the runner incorrectly expected direct
PostgREST exclusion errors to return 409. Its fixtures were cleaned up, the
assertion was corrected to 400/23P01, and the complete rerun passed. Hono's
user-facing conflict contract remains 409. No database rule was weakened.

Together with the 49-test backend suite, TypeScript check, and user-confirmed SQL
tests, this completes VG2. These are API/database checks, not additional browser
UI evidence. Credentials remain in the ignored local account file.

### Booking calendar with disabled unavailable dates - 2026-10-09

Added frontend/src/components/BookingDatePicker.tsx and frontend/src/lib/availability.ts
to the creation form. The calendar uses keyboard-accessible date buttons, grey
disabled past/occupied dates, separate check-in/check-out selection, month navigation,
and a clear action. Checkout is exclusive, so the next booking's check-in can be
selected as departure. Checkout options that cross any blocked night are disabled.
Date selections continue to support preview totals and the login-preserved draft.

Prepared migration 020 and GET /properties/:id/availability to expose only upcoming
pending/confirmed date ranges through a restricted security-definer RPC. Private
booking rows and guest information remain protected by unchanged RLS. The client
refreshes availability on focus, every minute, and after successful/conflicting
booking writes. Loading/errors disable the calendar and submission; stale selected
ranges show an error. VG2's database constraint still guards concurrent changes.

All 51 backend tests pass, including public endpoint/no-store and missing/error cases.
Four frontend date-rule tests cover boundaries, blocked intervals, invalid dates,
cross-month refresh, leap years, and year rollover. Backend/frontend TypeScript and
frontend ESLint pass. Hosted migration 020 and its rollback-only SQL tests are
pending. Browser preview could not run because the browser automation kernel failed
to start; visual/interactive verification remains pending.

### Hosted calendar availability verification - 2026-10-09

The user confirmed migration 020 and database/tests/property_availability.sql
passed. This is user-reported SQL evidence; no SQL result export was supplied.
Ran backend/scripts/verify-availability-live.mjs against the configured hosted
Supabase project using the current Hono source on an ephemeral loopback port,
actual HTTP requests, separate host/guest cookie stores, and the normal
publishable/anon key. No admin client or mocked database was used.

All 13 checks passed: empty property returns []; pending and confirmed bookings
expose exactly check_in/check_out to anonymous users; the direct anonymous
Supabase RPC returns the same date-only payload; anonymous booking-detail reads
remain 401; cancellation frees dates; and missing properties return 404.
Availability responses carry no-store. The disposable booking/property were
deleted and the runner exited zero; existing records were untouched.

Earlier pending migration/SQL/API notes are superseded. Browser automation was
retried after resetting its kernel and failed to start again, so visual and
interactive browser confirmation remains pending. The date rules, backend and
frontend typechecks, frontend lint, 51 backend tests, and four date-rule tests
passed as recorded above.

### Booking creation summary page - 2026-10-09

The user confirmed the availability calendar works and supplied a screenshot
of the post-booking form. The screenshot showed the cleared form remaining in
checkout mode with all calendar days disabled, followed by the creation message.
Successful creation now replaces that route with /bookings/:id/created using
the booking ID returned by the API. The form displays a brief success/navigation
state instead of clearing back to the calendar; a fallback summary link is shown.
An immediate submission guard and disabled success state prevent double clicks.

Added BookingCreatedSummary and the new dynamic route. The page fetches the saved
booking through the existing authenticated/RLS-protected endpoint, so refreshing
the page works without trusting a query-string payload or local cached booking.
It shows property image/name/location when available, check-in/out, nights, guest
count/contact information, status, booking reference, and an estimated total at
the current nightly rate. Pending requests are explicitly awaiting host confirmation;
creation is not presented as host approval. Missing properties retain the saved
title and booking details. Loading, sign-in, missing/inaccessible, retry states,
and links to bookings/property/browse are provided.

Frontend route type generation, TypeScript, ESLint, and production build pass.
The production output includes /bookings/[id]/created. This change needs no new
SQL migration. Browser redirect and summary visual confirmation remain pending;
the earlier user confirmation covers the availability calendar itself.

### VG3 capacity implementation prepared - 2026-10-09

API booking creation and updates query the active property?s current saved max_guests using the authenticated user client. Strict request validation rejects forged capacity fields. Oversized requests return a clear 400; database capacity changes after the precheck return a clear 409. Migration 021 adds database triggers checking positive whole guest counts and saved capacity, using a property SHARE lock to coordinate concurrent capacity changes. Unsafe reductions below pending/confirmed upcoming reservations return 409. Cancellation and unchanged historical maintenance remain possible. No existing records are modified.

All 55 backend tests and TypeScript checks passed. Coverage includes exact/oversized counts, changed capacity, forged fields, missing properties, database errors and mutation race errors. The live runner passes syntax validation. Hosted SQL and live requests have not run; VG3 remains unchecked. Follow requests/capacity-live.md for preflight, migration, rollback tests and disposable API/direct-Supabase verification.

### VG3 hosted verification complete - 2026-10-09

User confirmed the capacity preflight, migration 021 and rollback SQL tests passed. The capacity live runner then passed all 22 checks against the current API and hosted Supabase using separate host and guest test sessions. Exactly max_guests was accepted; max_guests + 1 was rejected on API create/update and direct Supabase create/update (23514). Forged max_guests and capacity request fields were rejected. Failed updates preserved the saved guest count. Reducing capacity below an upcoming reservation was rejected with 409; after reducing the reservation guest count, the capacity change succeeded and both API/database respected the new limit. Increasing capacity allowed the new maximum. Cancellation allowed capacity reduction. All disposable bookings and properties were removed and runner sessions logged out locally.

Together with the 55 passing backend tests and TypeScript checks, this completes VG3. No additional browser or concurrent-capacity live checks are claimed.
