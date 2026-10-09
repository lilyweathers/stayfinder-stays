# VG5 booking time verification

Run in the Supabase SQL Editor, as administrator:

1. `database/022_booking_time.sql` after migration 021.
2. `database/tests/time_rules.sql` — expect PASS; all fixtures are rolled back.

Then, from `backend`, run:

```powershell
node --import tsx scripts/verify-time-live.mjs
```

The runner uses the ignored VG1 test accounts and removes its disposable records. It checks API/direct-Supabase past creation rejection, same-day and future creation, same-day editing/confirmation/cancellation, and rejection of updates moving a future check-in into the past. It compares the API helper and hosted database function at winter/summer midnight and daylight-saving boundaries. Existing-past-booking mutations are verified using administrator-created historical fixtures in the rollback SQL test and API mocks; the live runner cannot create historical records with normal user credentials.

Policy: booking fields are calendar dates. “Today” is the date in `Europe/Stockholm`, independent of browser, API server, or database session timezone. Check-in today is allowed; check-out must be later than check-in. Once the saved check-in is before today, guests and owners cannot edit, confirm, cancel, delete, or move that booking forward. Administrators may preserve and backfill historical records. Migration 022 changes no existing records.

Stockholm midnight is 23:00 UTC on the tested winter dates and 22:00 UTC on the tested summer dates. Tests also cover the spring clock jump and autumn repeated hour. API validation reads its current clock; database writes use the transaction timestamp. A request crossing midnight can therefore be rejected by the final database check; the API returns a clear 409 conflict.
