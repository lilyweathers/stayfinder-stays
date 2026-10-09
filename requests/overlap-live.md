# VG2 live overlap verification

In Supabase SQL Editor, as administrator:

1. Run `database/tests/overlap_preflight.sql`. Both results should be empty.
   If it lists records, resolve their dates/status deliberately before migrating.
   No automatic changes to existing records are made.
2. Apply `database/019_booking_overlap.sql` after migrations through 018.
3. Run `database/tests/overlap.sql`. It should report PASS and roll back fixtures.
   After any SQL failure run `ROLLBACK` before retrying and retain the error.

The interval is `[check_in, check_out)`: checkout and the next check-in may be
the same date. Pending and confirmed bookings block dates; cancelled ones do not.

The live runner reuses the ignored `requests/local/ownership-accounts.json` file
from VG1. With the configured development Supabase project, run from backend:

```powershell
node --import tsx scripts/verify-overlap-live.mjs
```

It launches the current Hono source on an ephemeral loopback port. Account sessions
use separate cookie stores and the publishable/anon key; no admin client is used.
It creates disposable properties/bookings and tests exact, contained, enclosing,
and edge overlaps against another guest's RLS-hidden booking; overlapping updates;
unchanged dates; adjacency on both ends; confirmed/cancelled blockers; and separate
properties. Failed updates must leave the stored booking unchanged.

Two simultaneous API creates must produce exactly one 201 and one 409, with only
one active row persisted. The runner repeats that case directly against Supabase
using each account's actual token, requiring one 201 and one 400 with `23P01`.
PostgREST maps this database code to 400; the Hono API translates it to 409.
The runner also verifies a direct overlapping update is denied with 400/23P01.

Only IDs created by the run are cleaned up: bookings first, then properties.
Cancelled fixture deletion requires migration 012 and uses its property owner.
If cleanup fails, remaining disposable IDs are printed and the runner fails.
Existing properties/bookings are untouched; credentials and tokens are not printed.
These checks verify API/database rules, not browser UI feedback.
