# VG3 capacity verification

In the Supabase SQL Editor, run these files in order:

1. `database/tests/capacity_preflight.sql` — both result sets must be empty. If rows appear, review them before applying the migration; do not silently change existing reservations.
2. `database/021_booking_capacity.sql` — apply after migration 020.
3. `database/tests/capacity.sql` — expect PASS; fixtures are rolled back.

Then, from `backend`, run:

```powershell
node --import tsx scripts/verify-capacity-live.mjs
```

The live runner uses the ignored `requests/local/ownership-accounts.json` host and guest accounts. It checks actual API and direct Supabase writes, exact and excessive guest counts, forged capacity fields, changed capacity, preserved data after rejected updates, and protection against unsafe capacity reductions. It creates disposable records and removes them afterward.

Pending and confirmed upcoming reservations protect their guest counts when capacity is reduced. Cancelled and past reservations do not block reductions. Cancellation keeps historical guest counts intact. The database locks the property row during booking validation to coordinate capacity changes with booking writes.
