# Database changes

Use the existing development Supabase/PostgreSQL project. This folder is
reserved for versioned SQL describing its schema, constraints, and policies.
No database changes have been applied by the repository preparation steps.

Before adding migrations, record the current schema from the existing project
and compare it with the columns documented in `backend/README.md`. Do not run
new CREATE TABLE statements over existing tables blindly. Future SQL changes
should be committed here so the database setup can be reproduced.

Do not include passwords, API keys, connection strings, or real user data in
schema files. The backend's connection settings stay in `backend/.env`.

## Auth lecture policies

`001_auth_rls.sql` enables RLS and supplies the basic lecture policies for the
existing properties and bookings tables. See [auth setup](../docs/auth-setup.md)
for dashboard steps and policy review. These basic policies were applied to the stay-finder project on 2026-10-06.

## VG1 ownership migration

Run these files in order in Supabase SQL Editor as the database administrator:

1. `002_ownership.sql`: add owner_id/guest_id and replace the shared-access policies.
2. `003_assign_existing_ownership.sql`: assign unowned existing records to the
   user-requested account `test@gmail.com`. This transaction fails if that account
   does not exist or its email matches multiple users; existing assignments stay intact.
3. `tests/ownership.sql`: verify guest isolation, host visibility, nonowner denial,
   spoofed ownership rejection, immutable ownership, and public property reads.
   Test records are rolled back. If a test fails, run `ROLLBACK` before retrying.

The backend changes require migration 002 before writes will work. Do not rerun
001 after 002: its shared-access policies would weaken ownership protection.
002 deliberately replaces all policies on these two tables, including custom
policies; review it before applying. Public property reads remain available.

Existing rows are preserved. Unassigned properties cannot be edited by regular
users; unassigned bookings are visible only to their property's assigned host.
New records use the authenticated user's ID, never a client-supplied owner.
Guests and hosts may update/delete visible bookings under VG1. Status/role and
time restrictions belong to the still-pending VG4/VG5 criteria.

Bookings cannot be moved to another property or guest, and property ownership
cannot be transferred through the public API/database roles. An administrator
may perform deliberate ownership maintenance. Keep using request-scoped clients
with the user's token; never substitute a service-role key in the backend.

These migration and database verification scripts have not yet been executed
against the hosted project. Mocked backend tests do not verify PostgreSQL RLS.

## Booking cancellation

Apply `004_booking_cancellation.sql` after the ownership migration. It blocks
edits/deletions of cancelled bookings and bookings whose check-in date has
passed, including direct database requests. The API exposes
`POST /bookings/:id/cancel`; the frontend asks for confirmation and updates the
returned booking's status without deleting the record. Guests and property
owners can cancel pending/confirmed bookings. Same-day cancellation is allowed
using Europe/Stockholm as the shared date boundary.

Run `tests/cancellation.sql` after 004 to check the database rules with rollback-only
fixtures. Neither the migration nor its live database checks have been run here.
VG4 confirmation permissions/transitions and VG5 create-time date rules remain
unfinished; this cancellation work does not complete those entire criteria.

## Transfer original properties to the host account

The user subsequently requested host@gmail.com own the six original properties.
Run `005_assign_properties_to_host.sql` as administrator after creating that
Supabase account. The script transfers exactly those six records and returns
their ownership emails for verification. Booking guest assignments are preserved.
The earlier backfill.sql property expectations describe the previous test@gmail.com
assignment and will no longer match after this transfer. Use 005's final SELECT
to verify the new property assignments. The user confirmed running the transfer
on 2026-10-08. owner_id stores the account UID; the final query shows its email.

Property POST automatically assigns the signed-in user's ID. A missing/null user
returns 401; G6 and the ownership policy require authentication for creation.
Nullable owner_id supports legacy/admin-managed records, not anonymous creation.
