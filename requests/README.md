# StayFinder request verification

[stayfinder.http](stayfinder.http) is the final submission request file. Expected
statuses describe the implemented contract; observed live results are in
[criteria-evidence.md](../docs/criteria-evidence.md).

Start the backend and use REST Client or equivalent tooling. Replace fixture
UUIDs, future dates and actor cookies locally. Authenticate host, guest A and
guest B separately, with separate cookie stores. Anonymous cases require a clean
store: clients can attach cookies automatically. Include the configured frontend
Origin on mutations. Keep credentials in private tooling or an ignored copy under
requests/local/. Never commit cookies, passwords or JWTs.

Run cases individually with stated preconditions. Capture returned IDs. The main
property has capacity 2 and rate 1000; the price case changes it to 1200.
Confirmation/cancellation/deletion alter fixtures. Some cases require independent
fixtures; this file is not an automatic suite. Run logout last. Verify denied
writes leave rows unchanged. Delete disposable bookings before properties;
retain administrator-created historical fixtures used for past-booking tests.

## Executable VG checks

Apply migrations through 025. Configure the ignored confirmed test accounts as
described in [ownership-live.md](ownership-live.md). Run sequentially from backend:

```powershell
node --import tsx scripts/verify-ownership-live.mjs
node --import tsx scripts/verify-overlap-live.mjs
node --import tsx scripts/verify-capacity-live.mjs
node --import tsx scripts/verify-status-live.mjs
node --import tsx scripts/verify-time-live.mjs
node --import tsx scripts/verify-price-live.mjs
node --import tsx scripts/verify-search-live.mjs
```

They start an isolated loopback API using current source, create disposable
fixtures, assert real HTTP/database results and clean up.

| Rule | Success, rejection and boundary coverage |
| --- | --- |
| VG1 | [Ownership](ownership-live.md): derived IDs, participant access, spoofing/nonowner denials, immutable relationships |
| VG2 | [Overlap](overlap-live.md): free/adjacent/cancelled stays, overlapping writes, concurrent API/direct DB creates |
| VG3 | [Capacity](capacity-live.md): exact capacity, oversized writes, forged capacity, unsafe reductions |
| VG4 | [Status](status-live.md): host confirmation, participant cancellation, guest/unrelated denial, invalid transitions |
| VG5 | [Time](time-live.md): today/future accepted, past creation/movement denied, Stockholm midnight/DST |
| VG6 | [Price](price-live.md): trusted totals, frozen rates, changed rates for new bookings, forged API/direct DB values overwritten |
| VG7 | [Search](search-live.md): occupied exclusion, free/adjacent/cancelled inclusion, filters/sorts, invalid/incomplete dates |

VG6 defeats tampering by discarding/overwriting prices: the request may succeed
while the forged price is rejected as a source of truth.

Direct database checks use the publishable/anon key and real user JWT, never a
service-role key as proof of RLS. SQL tests under database/tests/ run with rollback
fixtures in Supabase SQL Editor. Historical fixtures need an administrator;
normal API creation rejects past dates. See [SQL setup](../database/README.md)
and [direct RLS checks](supabase-rls.md). Mocked tests alone do not prove RLS.
