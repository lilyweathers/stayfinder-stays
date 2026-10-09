# VG4 status and roles verification

The database rules already exist in migrations 002, 006 and 012. No new migration is required with migrations through 021 applied.

Run `database/tests/status_roles.sql` as administrator in the Supabase SQL Editor. Expect PASS; all test users, properties and bookings are rolled back. This verifies owner-only confirmation, guest/owner cancellation from both pending and confirmed, unrelated-user isolation, cancelled detail-edit denial for both participants, and confirmed-to-pending denial.

From `backend`, run the live API/direct-Supabase verification:

```powershell
node --import tsx scripts/verify-status-live.mjs
```

It uses the ignored test-account file from VG1, creates disposable records, and cleans them up. The host account becomes an unrelated user for a second property owned and booked by the guest account; this tests isolation without a third account. Direct updates to RLS-hidden rows return HTTP 200 with no affected rows; persisted status is checked afterward.

General booking edits preserve saved status when omitted. New bookings start pending. Participants may cancel; only the property owner may confirm. Cancelled bookings cannot be edited or reopened, and confirmed bookings cannot return to pending. API failures use 403 for role denial, 404 for hidden/missing records, and 409 for invalid transitions or a status change between the read and write. Existing current/future check-in restrictions remain in force.
