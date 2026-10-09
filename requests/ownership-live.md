# VG1 live API verification

The runner uses the current backend source and actual HTTP requests to a temporary
loopback API server connected to the Supabase project in `backend/.env`. It uses
the normal publishable/anon key and account sessions, never the admin key.

Create `requests/local/ownership-accounts.json` (already ignored by Git):

```json
{
  "host": { "email": "HOST_TEST_EMAIL", "password": "HOST_TEST_PASSWORD" },
  "guest": { "email": "GUEST_TEST_EMAIL", "password": "GUEST_TEST_PASSWORD" }
}
```

Use two distinct confirmed development accounts. Apply the existing ownership,
booking status, and deletion migrations through 012 before running. From backend:

```powershell
node --import tsx scripts/verify-ownership-live.mjs
```

The runner creates two disposable properties and three future bookings. It checks
verified ownership assignment, spoofed IDs, guest/host edits, confirmation,
cancellation, deletion, and immutable booking-property relationships. On the second
property the guest is also its owner, making the other account unrelated. This
checks list isolation, single-record reads, and all booking mutation routes for
an unrelated authenticated user; denied mutations must leave the row unchanged.

Cleanup deletes only records created during the run, removing bookings before
properties to avoid retained history. If cleanup fails, the script prints the
remaining disposable IDs and exits with failure. It does not modify existing
properties or bookings. Account logout can affect other sessions of these test
accounts. Passwords and cookies are never printed or committed.

Record actual output in `docs/criteria-evidence.md` only after a completed run.
This runner verifies API/database behavior; it does not add browser UI evidence.
