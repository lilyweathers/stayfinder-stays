# StayFinder criteria

Target: all G1–G16 and all VG1–VG7. The assignment requires all G criteria and at least four VG criteria for VG; this project selects all seven.

## Current status (2026-10-08)

- **G criteria: 16/16 complete.**
- **VG criteria: all seven selected; completion remains tracked below.**
- Latest checks: 32 backend tests pass; backend/frontend TypeScript and frontend ESLint pass.
- Detailed milestones and verification records are in [criteria-evidence.md](criteria-evidence.md). Mocked API tests do not establish PostgreSQL enforcement; browser and hosted database results are identified separately.

## G checklist

| Complete | Criterion | Required result | Implementation and verification |
| --- | --- | --- | --- |
| [x] | G1 | Visitors can register, log in, and log out. | Browser registration, login, session display, and logout confirmed by the user. |
| [x] | G2 | Login survives reload; the app can identify the logged-in user. | Cookie sessions and current-user checks implemented; authenticated reload confirmed by the user. |
| [x] | G3 | Navigation changes for authenticated and anonymous visitors. | Navigation shows account email and Logout when signed in; Login/Register after logout. |
| [x] | G4 | Everyone can view the property list and individual details. | Public list/detail routes implemented; live API and browser property display verified. |
| [x] | G5 | Filter by location, maximum price, and guest count. | Location, maximum nightly price, and guest filters run in the database; live API and browser checks passed. |
| [x] | G6 | Property writes require authentication in both API and database. | API authentication guards and hosted RLS protect property writes; authenticated and anonymous checks passed. |
| [x] | G7 | An authenticated user can create a property using a frontend form. | My Properties creation form implemented; API derives owner_id from the session; browser creation confirmed. |
| [x] | G8 | Sort by ascending or descending price in the backend. | Backend price sorting supports asc/desc with stable ties; live API and browser checks passed. |
| [x] | G9 | Authenticated users can book from details; visitors are prompted to log in. | Sign-in preserves booking details and returns to the property; authenticated booking flow confirmed. |
| [x] | G10 | Reject invalid bookings and show understandable form errors. | API/form validate fields, calendar dates, date order, and past check-in; browser errors/date picker confirmed. |
| [x] | G11 | Show nights and total price before submission. | Booking form previews nights and estimated total, including after sign-in; calculation and browser checks passed. |
| [x] | G12 | Authenticated users can view, change, and delete bookings for a property. | Owner management supports viewing, editing, confirming, cancelling, and deleting bookings; browser checks passed. Hosts may delete current/future cancelled bookings after migration 012. |
| [x] | G13 | Loading, fetch-error, and missing-property views exist. | Property loading, fetch-error/recovery, and missing-property views implemented; HTTP rendering checked. |
| [x] | G14 | API returns appropriate status codes. | Automated tests cover 200/201/400/401/403/404/409/500; isolated real HTTP checks used simulated Supabase responses. |
| [x] | G15 | Database permissions protect tables independently of the API. | Hosted RLS verified independently of the API; user reported all 43 direct Supabase assertions passed. |
| [x] | G16 | Backend and frontend data are typed. | Backend/frontend domain and API types plus typed Supabase queries implemented; TypeScript and compile-only database assertions pass. |

## VG checklist: all seven selected

Each rule must remain effective when the frontend is bypassed. The planned API
behavior must be backed by database enforcement or database queries as appropriate.

| Done | Criterion | Planned location and reason | Verification to record |
| --- | --- | --- | --- |
| [x] | VG1 Ownership | API derives ownership from verified identity, constrains property writes, and uses the user's token for booking RLS. database/002_ownership.sql replaces shared policies and prevents ownership/booking-property transfers. | All 48 automated backend tests pass. User-confirmed database ownership checks and backfill verified on 2026-10-08. On 2026-10-09, all 36 live HTTP checks against hosted Supabase passed: verified creation ownership, spoofed IDs, nonowner property denial, guest/host booking edits and cancellation, host-only confirmation, participant deletion, unrelated-user read/mutation isolation, and denied booking-property transfer. Denied writes left the booking unchanged; all disposable fixtures were cleaned up. See docs/criteria-evidence.md and requests/ownership-live.md. |
| [x] | VG2 No overlapping bookings | API maps PostgreSQL exclusion conflicts to clear HTTP 409 responses. database/019_booking_overlap.sql adds an atomic partial GiST exclusion constraint for pending/confirmed bookings, using [check_in, check_out) so adjacent stays are allowed. | All 49 backend tests and TypeScript checks pass. User confirmed preflight, migration 019, and rollback-only SQL tests passed on 2026-10-09. All 31 live checks passed: overlapping creates/updates rejected even against hidden bookings; unchanged dates and adjacent stays allowed; confirmed blocks and cancelled does not; concurrent API and direct-Supabase creates each persist exactly one active booking. Failed updates preserve data; fixture cleanup complete. See docs/criteria-evidence.md. |
| [x] | VG3 Capacity | API checks the property's current database capacity; database enforces the same rule on booking creation and updates. Client capacity values are never trusted. | All 55 backend tests and TypeScript checks pass. User confirmed preflight, migration 021 and rollback SQL tests passed on 2026-10-09. All 22 live checks passed: exact capacity accepted; oversized API/direct-Supabase creates and updates rejected; changed saved capacity respected; forged client capacity rejected; failed updates preserve data; unsafe reductions blocked and cancelled bookings permit reductions. Disposable records cleaned up. See docs/criteria-evidence.md. |
| [x] | VG4 Status and roles | API checks roles and translates failures; database enforces transitions and who can perform them. Only property owner confirms; guest or owner cancels. | API role/transition checks implemented, omitted update status preserved and database failures translated. Existing database migrations 002/006/012 enforce the rules. All 58 backend tests and TypeScript checks pass. All 133 live API/direct-Supabase checks passed on 2026-10-09; cleanup complete. User confirmed expanded rollback-only database/tests/status_roles.sql passed on 2026-10-09. See docs/criteria-evidence.md. |
| [x] | VG5 Time rules | API and database enforce the same calendar-date policy. Database checks writes independently. | All 61 backend tests and TypeScript checks pass. User confirmed migration 022 and rollback SQL tests passed on 2026-10-09, including past saved-booking edit/cancellation denial for both participants. All 28 live API/direct-Supabase checks passed: past creation and moving future check-in into the past rejected; today/future creation allowed; same-day edits and cancellation allowed; winter/summer midnight and DST boundaries agree in Europe/Stockholm. Failed writes preserve data; disposable records cleaned up. See docs/criteria-evidence.md. |
| [x] | VG6 Server price | Backend calculates nights times current database price and persists total_price. Database guarantees the trusted saved value. Submitted client price is ignored. Existing bookings retain their saved price when the property price changes. | API discards client prices and persists database-rate totals; migrations 023/024 enforce trusted saved prices and decimal property rates. All 63 backend tests and TypeScript checks pass; frontend types, lint and production build pass. User confirmed migration 024 and rollback price tests passed on 2026-10-09 after correcting the original integer rate column. All 18 live API/direct-Supabase checks passed: forged prices ignored, known decimal total correct, existing totals unchanged after property price change, date edits use frozen rate, new bookings use changed rate, cancellation preserves price. Cleanup complete. See docs/criteria-evidence.md. |
| [ ] | VG7 Available-date search | API validates dates and combines availability, filters, and sorting. Database query checks the requested interval against noncancelled bookings using the VG2 overlap convention. | Available/unavailable properties; cancelled booking ignored; adjacent stays; invalid or incomplete periods rejected; combined location/price/guests filters and both sort orders. |

## Application conventions

- Use Supabase user IDs for ownership and a verified, request-specific user client for protected queries.
- Validate real calendar dates and require checkout after check-in. “Today” uses Europe/Stockholm; same-day check-in is allowed.
- Keep cancellation and deletion separate. Past bookings are protected; hosts may delete current/future cancelled bookings under migration 012.
- Property/account deletion removes owned properties, cancels upcoming active bookings, and retains booking history under migration 011.
- Frontend totals are estimates. Trusted saved pricing, capacity enforcement, and available-date search remain VG work. Overlap enforcement in migration 019 is verified against the hosted database.
- Overlap convention: [check_in, check_out), allowing adjacent stays. Settle price recalculation and capacity-reduction rules during VG implementation.

## Remaining work

1. Complete and verify the seven selected VG criteria, including direct database and concurrent-write checks where relevant.
2. Complete submission requests showing successful, rejected, and boundary cases for each selected criterion.
3. Record new results in [criteria-evidence.md](criteria-evidence.md) and update the corresponding checklist only after full verification.

## Submission and oral review

- [x] Repository covering backend and frontend: [stayfinder-stays](https://github.com/lilyweathers/stayfinder-stays).
- [ ] Final list of fulfilled criteria with supporting evidence.
- [ ] API request file covering successful and rejected calls, including every selected VG rule.
- [ ] Complete database permission/constraint verification beyond mocked API tests.
- [ ] Rehearse the app demonstration and explanations for the 8–10 minute review.

Be ready to explain authentication versus authorization, session cookies, direct database protection, and why each rule belongs in the API, database, or both. Explain the code in your own words.
