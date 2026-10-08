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

## Host booking confirmation

Apply `006_booking_status_roles.sql` after 002 and 004. New bookings must be
pending; only their property's owner can transition pending to confirmed.
Guest/host cancellation remains allowed by participant RLS; status reversal is
blocked. Run `tests/status_roles.sql` to verify using rollback-only fixtures.
These scripts have not been executed in the hosted database yet.
The frontend management pages live under My Properties, and confirmation uses
POST /bookings/:id/confirm. Property writes still require its owner.

## Property deletion with booking cancellation

Apply `007_property_deletion.sql` before running the updated backend: property
queries now depend on deleted_at. DELETE /properties/:id calls the owner-checked
delete_property RPC. It locks the property, cancels pending/confirmed bookings
with check-in today or later (Europe/Stockholm), and sets deleted_at atomically.
Active lists exclude the property. History is preserved; guests retain access
to their booking records. Direct hard deletion and archiving through regular
updates are blocked, and a database trigger blocks new bookings after deletion.
The privileged RPC explicitly checks auth.uid() against owner_id; it does not
accept an owner from the client. Only authenticated callers can execute it.

Run `tests/property_deletion.sql` for rollback-only database verification. The
migration and live checks have not been run here. Re-running older migrations
that replace policies can remove these restrictions; apply migrations in order.

## Separate guest and host booking views

GET /bookings filters by the authenticated user's guest_id. Hosts use
GET /bookings?property_id=...; the backend verifies property ownership first.
Apply 008_booking_access.sql to add restrictive participant policies that also
protect against any leftover shared-access permissive policy.
009_assign_current_bookings_to_test.sql is a user-requested one-time reassignment
of all current booking guest IDs to test@gmail.com. It preserves property owners
and new API bookings still belong to their creator. Do not rerun 009 after other
guests begin making new bookings. Hosted application of 008/009 is unverified.

## Account deletion

Apply `010_user_deletion.sql` after 007. Deleting an account through Supabase Auth
archives all its properties and cancels their pending/confirmed bookings with
check-in today or later (Europe/Stockholm). Past bookings and property rows are
retained as history. Ownership/guest foreign keys use ON DELETE SET NULL so
references do not block account deletion. This does not create a frontend
account-deletion endpoint or grant users permission to delete accounts.
Run `tests/user_deletion.sql` as administrator for rollback-only verification.
The user confirmed the hosted database test passed on 2026-10-08. This is
user-reported verification; test fixtures were rolled back.

The frontend Profile page supports password-confirmed account deletion through
DELETE /auth/account. Configure SUPABASE_ADMIN_KEY in backend/.env with a
backend-only Supabase secret/service-role key and restart the backend. Keep
SUPABASE_KEY as publishable/anon: the admin client is used only for deleting the
verified current user's Auth account. Never put the admin key in frontend env.
Migration 010 must be applied before using this action. Auth deletion activates
its account-deletion trigger. API tests mock Supabase. The user confirmed a live
temporary-account deletion on 2026-10-08, including removal of its property.

## Permanent property deletion (supersedes soft deletion)

Apply `011_permanent_property_deletion.sql` after 010. Deletion through Manage
property or account deletion now permanently removes property rows and preserves
all booking rows, including the old property UUID and a saved property title.
Upcoming pending/confirmed bookings are cancelled; past statuses stay unchanged.
This migration also permanently removes all previously archived property rows.
Bookings for removed properties appear by default on the guest Bookings page,
with their saved title and no property link. Access remains restricted to their
guest once the property's owner relationship no longer exists.

The property foreign key is removed so it cannot cascade-delete bookings or block
deletion. The existing active-property insert trigger and immutable-identity
trigger validate new bookings and prevent clients from moving them. Normal direct
property DELETE remains blocked; owners must use the checked deletion RPC.
Run `tests/property_deletion.sql` and `tests/user_deletion.sql` after 011 for
rollback-only verification. The user confirmed application of 011 and a passing
user_deletion.sql test on 2026-10-08 (user-reported; fixtures rolled back).
The separate property_deletion.sql result after 011 remains unconfirmed.

## Host deletion of cancelled bookings

Apply `012_host_cancelled_booking_deletion.sql` after 011. It allows only the
current property owner to delete cancelled bookings whose check-in is today or
later (Europe/Stockholm). Guests still cannot delete cancelled bookings; all
cancelled booking edits and all past booking deletions remain blocked.
Run `tests/host_cancelled_booking_deletion.sql` for rollback-only verification.
The user confirmed the migration, hosted tests, and browser flow work on
2026-10-08. Do not reapply 004 afterward, as it
would restore the older blanket cancelled-deletion restriction.
