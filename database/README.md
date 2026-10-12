# Supabase SQL setup

The submitted app uses the existing development project with migrations through
025. See [verification history](../docs/criteria-evidence.md). Installing npm
packages does not create tables or apply SQL.

## Initial schema and migration order

On the existing course database, properties/bookings already exist. Do not
recreate them. On a fresh Supabase project, first run 000_base_schema.sql in SQL
Editor as administrator. It fails if tables already exist. The bootstrap is
provided for setup; this audit tested the existing hosted database, not a fresh
project migration rehearsal.

Apply schema migrations in numeric order from 001 through 025, with exceptions:

- Skip 003, 005 and 009 on a fresh project. They are historical one-time data
  assignments to original development accounts, not schema requirements.
- Do not expose the app while only 001 is applied: its shared lecture policies
  are replaced by ownership policies in 002.
- Before 019 run tests/overlap_preflight.sql; before 021 run
  tests/capacity_preflight.sql; before 023 run tests/price_preflight.sql.
  Review conflicts and legacy price backfill before proceeding.
- Apply 024 after 023 for decimal property rates, then 025 for availability search.
  Migration 015 creates the profile-photos storage bucket.

Configure email Auth, Site URL http://localhost:3001, confirmation and development
SMTP using [auth setup](../docs/auth-setup.md). Create your own confirmed test
accounts; property creation assigns their UIDs.

## Existing installation

Apply only missing migrations in order. Do not blindly rerun earlier files:
001 weakens ownership policies; 004 restores older cancellation restrictions;
007/010 describe soft deletion superseded by 011. Do not repeat 003/005/009 on
new records. Final definitions result from the ordered migration chain.

011 permanently removes deleted property rows, retains booking history and
cancels upcoming active bookings. 012 lets hosts delete current/future cancelled
bookings. Normal-role direct property DELETE is denied; use the checked RPC.

## Direct enforcement tests

| Rule | Implementation migrations | SQL test |
| --- | --- | --- |
| Ownership/RLS | 002, 008 | tests/ownership.sql |
| Overlap | 019 | tests/overlap.sql |
| Capacity | 021 | tests/capacity.sql |
| Status/roles | 004, 006, 012 | tests/status_roles.sql |
| Stockholm time | 022 | tests/time_rules.sql |
| Trusted/frozen prices | 023, 024 | tests/price.sql |
| Availability search | 025 | tests/available_search.sql |

Run rollback-only tests in SQL Editor; expect PASS/no exception. After a failed
transaction run ROLLBACK before retrying. Other tests cover property/account
deletion, cancellation, public profiles and calendar availability.
tests/backfill.sql records the earlier assignment before 005 and is historical.

[Live runners](../requests/README.md) also verify API and direct Supabase calls
with ordinary user JWTs, including simultaneous overlap attempts. They clean up
disposable records. Denied writes must preserve rows; policy-filtered reads may
return empty results. Do not use admin keys as proof of user permissions.

Keep real passwords/keys/connection strings out of SQL. Backend configuration
stays in ignored backend/.env. Normal queries use the publishable key plus user
session. The optional admin key is only for account deletion/registration photos.
