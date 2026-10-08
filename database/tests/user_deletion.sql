-- Run after 011 as administrator. All fixtures and deletions are rolled back.
BEGIN;
INSERT INTO auth.users (id, email) VALUES
  ('a1000000-0000-4000-8000-000000000001', 'removed-host@example.invalid'),
  ('a1000000-0000-4000-8000-000000000002', 'retained-guest@example.invalid');
INSERT INTO public.properties (property_id, owner_id, title, description, location, price_per_night, max_guests) VALUES
  ('b1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'Removed host property', 'Fixture', 'Test', 100, 2),
  ('b1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 'Retained property', 'Fixture', 'Test', 100, 2);
INSERT INTO public.bookings (booking_id, property_id, guest_id, guest_name, guest_email, check_in, check_out, guests, status)
SELECT id::uuid, 'b1000000-0000-4000-8000-000000000001'::uuid,
  'a1000000-0000-4000-8000-000000000002'::uuid, 'Guest', 'retained-guest@example.invalid', day, day + 2, 1, status
FROM (VALUES
  ('c1000000-0000-4000-8000-000000000001', (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Stockholm')::date, 'pending'),
  ('c1000000-0000-4000-8000-000000000002', DATE '2099-02-01', 'confirmed'),
  ('c1000000-0000-4000-8000-000000000003', DATE '2000-01-01', 'confirmed')
) AS fixtures(id, day, status);
-- A booking made by the host also must not prevent account deletion.
INSERT INTO public.bookings (booking_id, property_id, guest_id, guest_name, guest_email, check_in, check_out, guests, status)
VALUES ('c1000000-0000-4000-8000-000000000004', 'b1000000-0000-4000-8000-000000000002',
  'a1000000-0000-4000-8000-000000000001', 'Host as guest', 'removed-host@example.invalid', '2099-03-01', '2099-03-03', 1, 'pending');
DELETE FROM auth.users WHERE id = 'a1000000-0000-4000-8000-000000000001';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.properties WHERE property_id = 'b1000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'Deleted account property still exists'; END IF;
  IF (SELECT count(*) FROM public.bookings WHERE property_id = 'b1000000-0000-4000-8000-000000000001'
    AND deleted_property_title = 'Removed host property') <> 3 THEN
    RAISE EXCEPTION 'Booking history or property titles lost'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.properties WHERE property_id = 'b1000000-0000-4000-8000-000000000002'
    AND deleted_at IS NULL AND owner_id = 'a1000000-0000-4000-8000-000000000002') THEN
    RAISE EXCEPTION 'Unrelated property changed'; END IF;
  IF (SELECT count(*) FROM public.bookings WHERE booking_id IN
    ('c1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000002') AND status = 'cancelled') <> 2 THEN
    RAISE EXCEPTION 'Upcoming bookings were not cancelled'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE booking_id = 'c1000000-0000-4000-8000-000000000003' AND status = 'confirmed') THEN
    RAISE EXCEPTION 'Past booking changed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE booking_id = 'c1000000-0000-4000-8000-000000000004' AND guest_id IS NULL AND status = 'pending') THEN
    RAISE EXCEPTION 'Deleted guest reference was not cleared or unrelated booking changed'; END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.properties WHERE property_id = 'b1000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'Archived property still visible to guest'; END IF;
  IF (SELECT count(*) FROM public.bookings WHERE property_id = 'b1000000-0000-4000-8000-000000000001') <> 3 THEN
    RAISE EXCEPTION 'Guest booking history lost'; END IF;
END $$;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.properties WHERE property_id = 'b1000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'Archived property still public'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS: account deletion removes owned properties, preserves bookings and cancels upcoming stays; fixtures rolled back' AS result;
