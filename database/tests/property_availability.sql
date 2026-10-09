-- Administrator SQL Editor after 020; all fixtures roll back.
BEGIN;
INSERT INTO auth.users (id, email) VALUES
  ('a2000000-0000-4000-8000-000000000001', 'calendar-host@example.invalid'),
  ('a2000000-0000-4000-8000-000000000002', 'calendar-guest@example.invalid');
INSERT INTO public.properties (property_id, owner_id, title, description, location, price_per_night, max_guests)
VALUES
  ('b2000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'Calendar fixture', 'Rollback only', 'Test', 100, 2),
  ('b2000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000001', 'Empty calendar', 'Rollback only', 'Test', 100, 2);
INSERT INTO public.bookings (property_id, guest_id, guest_name, guest_email, check_in, check_out, guests, status)
VALUES
  ('b2000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000002', 'Private guest', 'private@example.invalid', '2099-01-10', '2099-01-14', 1, 'pending'),
  ('b2000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000002', 'Private guest', 'private@example.invalid', '2099-01-20', '2099-01-22', 1, 'confirmed'),
  ('b2000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000002', 'Private guest', 'private@example.invalid', '2099-01-15', '2099-01-17', 1, 'cancelled'),
  ('b2000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000002', 'Private guest', 'private@example.invalid', '2000-01-10', '2000-01-14', 1, 'confirmed');

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
DO $$ BEGIN
  IF public.get_property_availability('b2000000-0000-4000-8000-000000000001') IS DISTINCT FROM
    '[{"check_in":"2099-01-10","check_out":"2099-01-14"},{"check_in":"2099-01-20","check_out":"2099-01-22"}]'::jsonb THEN
    RAISE EXCEPTION 'Public availability must contain only future pending/confirmed date ranges';
  END IF;
  IF public.get_property_availability('b2000000-0000-4000-8000-000000000002') IS DISTINCT FROM '[]'::jsonb THEN
    RAISE EXCEPTION 'Empty property should return no blocked dates';
  END IF;
  IF public.get_property_availability('b2000000-0000-4000-8000-000000000099') IS NOT NULL THEN
    RAISE EXCEPTION 'Missing property should return null';
  END IF;
  IF EXISTS (SELECT 1 FROM public.bookings WHERE property_id = 'b2000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'Public calendar exposed private booking rows';
  END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"a2000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
UPDATE public.bookings SET status = 'cancelled'
WHERE property_id = 'b2000000-0000-4000-8000-000000000001' AND check_in = '2099-01-10';
DO $$ BEGIN
  IF public.get_property_availability('b2000000-0000-4000-8000-000000000001') IS DISTINCT FROM
    '[{"check_in":"2099-01-20","check_out":"2099-01-22"}]'::jsonb THEN
    RAISE EXCEPTION 'Cancellation did not free the calendar dates';
  END IF;
END $$;
RESET ROLE;
SELECT 'PASS: public date-only availability, pending/confirmed blockers, cancelled/past exclusions, empty/missing properties and unchanged booking privacy; rolled back' AS result;
ROLLBACK;
