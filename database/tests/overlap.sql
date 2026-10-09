-- Run as administrator after 019. All fixtures are rolled back.
-- Concurrency is tested separately by backend/scripts/verify-overlap-live.mjs.
BEGIN;
INSERT INTO auth.users (id, email) VALUES
  ('a1900000-0000-4000-8000-000000000001', 'overlap-host@example.invalid'),
  ('a1900000-0000-4000-8000-000000000002', 'overlap-guest@example.invalid');
INSERT INTO public.properties (property_id, owner_id, title, description, location, price_per_night, max_guests)
VALUES
  ('b1900000-0000-4000-8000-000000000001', 'a1900000-0000-4000-8000-000000000001', 'Overlap fixture', 'Rollback only', 'Test', 100, 2),
  ('b1900000-0000-4000-8000-000000000002', 'a1900000-0000-4000-8000-000000000001', 'Other fixture', 'Rollback only', 'Test', 100, 2);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"a1900000-0000-4000-8000-000000000001","role":"authenticated"}', true);
INSERT INTO public.bookings (booking_id, property_id, guest_name, guest_email, check_in, check_out, guests, status)
VALUES ('c1900000-0000-4000-8000-000000000001', 'b1900000-0000-4000-8000-000000000001', 'Host guest', 'overlap-host@example.invalid', '2099-01-10', '2099-01-14', 1, 'pending');

SELECT set_config('request.jwt.claims', '{"sub":"a1900000-0000-4000-8000-000000000002","role":"authenticated"}', true);
DO $$
DECLARE interval_start date; interval_end date;
BEGIN
  IF EXISTS (SELECT 1 FROM public.bookings WHERE booking_id = 'c1900000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'Fixture is not hidden by guest RLS';
  END IF;
  -- Exact match, contained, enclosing, overlap on either edge.
  FOR interval_start, interval_end IN
    VALUES (DATE '2099-01-10', DATE '2099-01-14'), (DATE '2099-01-11', DATE '2099-01-13'),
      (DATE '2099-01-09', DATE '2099-01-15'), (DATE '2099-01-09', DATE '2099-01-11'),
      (DATE '2099-01-13', DATE '2099-01-15')
  LOOP
    BEGIN
      INSERT INTO public.bookings (property_id, guest_name, guest_email, check_in, check_out, guests, status)
      VALUES ('b1900000-0000-4000-8000-000000000001', 'Guest', 'overlap-guest@example.invalid', interval_start, interval_end, 1, 'pending');
      RAISE EXCEPTION 'Overlapping insert accepted';
    EXCEPTION WHEN exclusion_violation THEN NULL; END;
  END LOOP;
END $$;

-- Adjacent stays on both boundaries and same dates on a different property.
INSERT INTO public.bookings (booking_id, property_id, guest_name, guest_email, check_in, check_out, guests, status)
VALUES
  ('c1900000-0000-4000-8000-000000000002', 'b1900000-0000-4000-8000-000000000001', 'Guest', 'overlap-guest@example.invalid', '2099-01-14', '2099-01-16', 1, 'pending'),
  ('c1900000-0000-4000-8000-000000000003', 'b1900000-0000-4000-8000-000000000001', 'Guest', 'overlap-guest@example.invalid', '2099-01-08', '2099-01-10', 1, 'pending'),
  ('c1900000-0000-4000-8000-000000000004', 'b1900000-0000-4000-8000-000000000002', 'Guest', 'overlap-guest@example.invalid', '2099-01-10', '2099-01-14', 1, 'pending');
DO $$ BEGIN
  UPDATE public.bookings SET guest_name = 'Unchanged dates'
    WHERE booking_id = 'c1900000-0000-4000-8000-000000000002';
  IF NOT FOUND THEN RAISE EXCEPTION 'Unchanged booking update rejected'; END IF;
  BEGIN
    UPDATE public.bookings SET check_in = '2099-01-13'
      WHERE booking_id = 'c1900000-0000-4000-8000-000000000002';
    RAISE EXCEPTION 'Overlapping update accepted';
  EXCEPTION WHEN exclusion_violation THEN NULL; END;
  IF NOT EXISTS (SELECT 1 FROM public.bookings
    WHERE booking_id = 'c1900000-0000-4000-8000-000000000002' AND check_in = '2099-01-14') THEN
    RAISE EXCEPTION 'Denied update changed dates';
  END IF;
  BEGIN
    INSERT INTO public.bookings (property_id, guest_name, guest_email, check_in, check_out, guests, status)
    VALUES ('b1900000-0000-4000-8000-000000000002', 'Guest', 'overlap-guest@example.invalid', '2099-03-01', '2099-03-01', 1, 'pending');
    RAISE EXCEPTION 'Empty date interval accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;

SELECT set_config('request.jwt.claims', '{"sub":"a1900000-0000-4000-8000-000000000001","role":"authenticated"}', true);
UPDATE public.bookings SET status = 'confirmed' WHERE booking_id = 'c1900000-0000-4000-8000-000000000001';
DO $$ BEGIN
  BEGIN
    INSERT INTO public.bookings (property_id, guest_name, guest_email, check_in, check_out, guests, status)
    VALUES ('b1900000-0000-4000-8000-000000000001', 'Host guest', 'overlap-host@example.invalid', '2099-01-11', '2099-01-13', 1, 'pending');
    RAISE EXCEPTION 'Confirmed booking did not block dates';
  EXCEPTION WHEN exclusion_violation THEN NULL; END;
END $$;
UPDATE public.bookings SET status = 'cancelled' WHERE booking_id = 'c1900000-0000-4000-8000-000000000001';
SELECT set_config('request.jwt.claims', '{"sub":"a1900000-0000-4000-8000-000000000002","role":"authenticated"}', true);
INSERT INTO public.bookings (property_id, guest_name, guest_email, check_in, check_out, guests, status)
VALUES ('b1900000-0000-4000-8000-000000000001', 'Guest', 'overlap-guest@example.invalid', '2099-01-10', '2099-01-14', 1, 'pending');

RESET ROLE;
SELECT 'PASS: hidden/pending/confirmed overlap denied, update unchanged, adjacent/different-property/cancelled cases allowed; fixtures rolled back' AS result;
ROLLBACK;
