# StayFinder criteria and verification plan

Target: all G1-G16 and all VG1-VG7. The assignment requires all G criteria and
at least four VG criteria for VG; this project's chosen scope includes all seven.
This document is a preparation checklist, not a claim that the features exist.

Mark an item complete only after implementing it, verifying the whole criterion,
and recording the code location and test evidence. A passing mocked API test
does not prove that PostgreSQL permissions or constraints work.

## Current starting point

- Backend: Hono, TypeScript, Supabase CRUD routes, and Zod body validation.
- Frontend: Next.js/TypeScript skeleton with a placeholder homepage.
- Seven existing API tests pass using mocked database responses.
- The user verified HTTP 200 and real records from both list endpoints.
- Authentication, ownership, booking rules, frontend flows, and database policies
  have not been verified as fulfilled assignment criteria.

## G checklist

| Done | Criterion | Required result | Verification to record |
| --- | --- | --- | --- |
| [ ] | G1 | Visitors can register, log in, and log out. | New account, valid login, rejected invalid login, logout. |
| [ ] | G2 | Login survives reload; the app can identify the logged-in user. | Reload authenticated pages; expired or invalid session; logout followed by reload. |
| [ ] | G3 | Navigation changes for authenticated and anonymous visitors. | Compare both states and verify changes after login/logout. |
| [ ] | G4 | Everyone can view the property list and individual details. | Anonymous and authenticated list/detail visits; correct data for each ID. |
| [ ] | G5 | Filter by location, maximum price, and guest count. | Each filter alone, combinations, boundary values, and no matches. |
| [ ] | G6 | Property writes require authentication in both API and database. | Anonymous create/update/delete denied through API and direct database API; authenticated owner allowed under VG1. |
| [ ] | G7 | An authenticated user can create a property using a frontend form. | Valid submission persists; invalid fields produce understandable errors. |
| [ ] | G8 | Sort by ascending or descending price in the backend. | Call API directly for both orders; combine with filters. |
| [ ] | G9 | Authenticated users can book from details; visitors are prompted to log in. | Both UI states; successful booking; anonymous direct API write denied. |
| [ ] | G10 | Reject invalid bookings and show understandable form errors. | Invalid email, zero guests, invalid calendar dates, equal/reversed dates; test API and UI. |
| [ ] | G11 | Show nights and total price before submission. | Known date/price example, changed dates, invalid dates; reconcile preview with VG6 server result. |
| [ ] | G12 | Authenticated users can view, change, and delete bookings for a property. | Permitted CRUD flows and denied access; apply VG1 ownership and VG4/VG5 restrictions. |
| [ ] | G13 | Loading, fetch-error, and missing-property views exist. | Slow request, failed request, and nonexistent property ID. |
| [ ] | G14 | API returns appropriate status codes. | Success 200, creation 201, invalid input 400, anonymous 401, missing 404; forbidden 403 and booking conflict 409 where applicable. |
| [ ] | G15 | Database permissions protect tables independently of the API. | Direct Supabase requests as anonymous user, guest A, guest B, and property owner; check reads and writes. |
| [ ] | G16 | Backend and frontend data are typed. | Both typechecks pass; inspect request, response, database, session, and error types; include actual fields such as created_at. |

## VG checklist: all seven selected

Each rule must remain effective when the frontend is bypassed. The planned API
behavior must be backed by database enforcement or database queries as appropriate.

| Done | Criterion | Planned location and reason | Verification to record |
| --- | --- | --- | --- |
| [ ] | VG1 Ownership | API verifies user identity and permitted operations; database ownership fields and row-level security enforce access independently. Derive owner IDs from the authenticated user. | Guest A cannot read guest B's bookings. Property owner sees all bookings for their property. Nonowner cannot update/delete a property. Spoofed ownership is denied through API and direct database requests. |
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

Use test accounts: property owner, guest A, guest B, and anonymous visitor.
Keep real credentials and access tokens out of committed request files.
Use an isolated development database for write tests.

For each completed criterion, record:

| Criterion | Code/SQL paths | Successful case | Rejected/boundary case | Result/date | Explanation of rule location |
| --- | --- | --- | --- | --- | --- |
| Example: VG2 | Fill after implementation | Nonoverlapping booking | Overlap and concurrent overlap | Fill after verification | Explain API error and atomic database protection |

## Submission and oral review

- [ ] Repository link covering backend and frontend.
- [ ] Accurate list of fulfilled criteria with evidence above.
- [ ] API request file showing successful and rejected calls, including every VG rule.
- [ ] Database permission/constraint verification, beyond mocked API tests.
- [ ] Rehearse the app demonstration and explanations for the 8-10 minute review.

Be ready to explain authentication versus authorization, session cookies, why API
protection alone is insufficient, how direct calls are handled, and why each rule
belongs in the API, database, or both. Explain code in your own words before
claiming its criterion complete.
