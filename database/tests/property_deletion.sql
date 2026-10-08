-- Run after 011 as administrator. All test records are rolled back.
BEGIN;
INSERT INTO auth.users (id, email) VALUES
  ('a7000000-0000-4000-8000-000000000001', 'delete-host@example.invalid'),
  ('a7000000-0000-4000-8000-000000000002', 'delete-guest@example.invalid');
INSERT INTO public.properties (property_id, owner_id, title, description, location, price_per_night, max_guests)
VALUES ('b7000000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000001', 'Delete fixture', 'Rollback only', 'Test', 100, 2);
INSERT INTO public.bookings (booking_id, property_id, guest_id, guest_name, guest_email, check_in, check_out, guests, status)
SELECT id::uuid, 'b7000000-0000-4000-8000-000000000001'::uuid, 'a7000000-0000-4000-8000-000000000002'::uuid,
  'Guest', 'delete-guest@example.invalid', check_in::date, check_in::date + 2, 1, status
FROM (VALUES
  ('c7000000-0000-4000-8000-000000000001', '2099-01-01', 'pending'),
  ('c7000000-0000-4000-8000-000000000002', '2099-02-01', 'confirmed'),
  ('c7000000-0000-4000-8000-000000000003', '2000-01-01', 'confirmed'),
  ('c7000000-0000-4000-8000-000000000004', '2099-03-01', 'cancelled')
) AS fixtures(id, check_in, status);
INSERT INTO public.bookings (booking_id, property_id, guest_id, guest_name, guest_email, check_in, check_out, guests, status)
VALUES ('c7000000-0000-4000-8000-000000000006', 'b7000000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000002',
  'Guest', 'delete-guest@example.invalid', (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Stockholm')::date,
  (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Stockholm')::date + 2, 1, 'pending');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"a7000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
DO $$ BEGIN
  IF public.delete_property('b7000000-0000-4000-8000-000000000001') IS NOT NULL THEN
    RAISE EXCEPTION 'Nonowner deleted property'; END IF;
END $$;
SELECT set_config('request.jwt.claims', '{"sub":"a7000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
DO $$ DECLARE result jsonb; BEGIN
  result := public.delete_property('b7000000-0000-4000-8000-000000000001');
  IF (result->>'cancelled_bookings')::integer IS DISTINCT FROM 3 THEN
    RAISE EXCEPTION 'Expected three upcoming cancellations including today'; END IF;
  IF public.delete_property('b7000000-0000-4000-8000-000000000001') IS NOT NULL THEN
    RAISE EXCEPTION 'Already deleted property deleted again'; END IF;
END $$;
SELECT set_config('request.jwt.claims', '{"sub":"a7000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.bookings WHERE property_id = 'b7000000-0000-4000-8000-000000000001') <> 5 THEN
    RAISE EXCEPTION 'Booking history lost'; END IF;
  IF (SELECT count(*) FROM public.bookings WHERE booking_id IN ('c7000000-0000-4000-8000-000000000001', 'c7000000-0000-4000-8000-000000000002') AND status = 'cancelled') <> 2 THEN
    RAISE EXCEPTION 'Upcoming bookings not cancelled'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE booking_id = 'c7000000-0000-4000-8000-000000000003' AND status = 'confirmed') THEN
    RAISE EXCEPTION 'Past booking changed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE booking_id = 'c7000000-0000-4000-8000-000000000006' AND status = 'cancelled') THEN
    RAISE EXCEPTION 'Same-day booking was not cancelled'; END IF;
  BEGIN
    INSERT INTO public.bookings (booking_id, property_id, guest_name, guest_email, check_in, check_out, guests, status)
    VALUES ('c7000000-0000-4000-8000-000000000005', 'b7000000-0000-4000-8000-000000000001', 'Guest', 'delete-guest@example.invalid', '2099-04-01', '2099-04-03', 1, 'pending');
    RAISE EXCEPTION 'Booking deleted property was allowed';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.properties WHERE property_id = 'b7000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'Deleted property still public'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.properties WHERE property_id = 'b7000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'Deleted property row still exists'; END IF;
  IF (SELECT count(*) FROM public.bookings WHERE property_id = 'b7000000-0000-4000-8000-000000000001'
    AND deleted_property_title = 'Delete fixture') <> 5 THEN
    RAISE EXCEPTION 'Booking history or title lost'; END IF;
END $$;
ROLLBACK;
SELECT 'PASS: property deletion and upcoming-booking cancellation verified; test records rolled back' AS result;
