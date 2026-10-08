-- User-requested backfill for existing, unassigned records only.
-- Run after 002_ownership.sql as database administrator in SQL Editor.
BEGIN;
DO $$
DECLARE account_id uuid;
BEGIN
  SELECT id INTO STRICT account_id FROM auth.users WHERE lower(email) = 'test@gmail.com';
  UPDATE public.properties SET owner_id = account_id WHERE owner_id IS NULL;
  UPDATE public.bookings SET guest_id = account_id WHERE guest_id IS NULL;
END;
$$;
COMMIT;
