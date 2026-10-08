-- Run as administrator after 002, 004 and 006. Fixtures are rolled back.
BEGIN;
INSERT INTO auth.users (id, email) VALUES
  ('a6000000-0000-4000-8000-000000000001', 'status-host@example.invalid'),
  ('a6000000-0000-4000-8000-000000000002', 'status-guest@example.invalid');
INSERT INTO public.properties (property_id, owner_id, title, description, location, price_per_night, max_guests)
VALUES ('b6000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000001', 'Status fixture', 'Rollback only', 'Test', 100, 2);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"a6000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
INSERT INTO public.bookings (booking_id, property_id, guest_name, guest_email, check_in, check_out, guests, status)
VALUES ('c6000000-0000-4000-8000-000000000001', 'b6000000-0000-4000-8000-000000000001', 'Guest', 'status-guest@example.invalid', '2099-01-01', '2099-01-03', 1, 'pending');
DO $$ BEGIN
  BEGIN
    UPDATE public.bookings SET status = 'confirmed' WHERE booking_id = 'c6000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'Guest confirmation was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.bookings (booking_id, property_id, guest_name, guest_email, check_in, check_out, guests, status)
    VALUES ('c6000000-0000-4000-8000-000000000002', 'b6000000-0000-4000-8000-000000000001', 'Guest', 'status-guest@example.invalid', '2099-02-01', '2099-02-03', 1, 'confirmed');
    RAISE EXCEPTION 'Preconfirmed insert was allowed';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claims', '{"sub":"a6000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
DO $$ BEGIN
  UPDATE public.bookings SET status = 'confirmed' WHERE booking_id = 'c6000000-0000-4000-8000-000000000001';
  IF NOT FOUND THEN RAISE EXCEPTION 'Host confirmation was denied'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE booking_id = 'c6000000-0000-4000-8000-000000000001' AND status = 'confirmed') THEN
    RAISE EXCEPTION 'Confirmed status not saved'; END IF;
  BEGIN
    UPDATE public.bookings SET status = 'pending' WHERE booking_id = 'c6000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'Confirmed to pending was allowed';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claims', '{"sub":"a6000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
DO $$ BEGIN
  UPDATE public.bookings SET status = 'cancelled' WHERE booking_id = 'c6000000-0000-4000-8000-000000000001';
  IF NOT FOUND THEN RAISE EXCEPTION 'Guest cancellation was denied'; END IF;
  BEGIN
    UPDATE public.bookings SET status = 'pending' WHERE booking_id = 'c6000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'Cancelled booking was reopened';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS: host-only confirmation and status transitions verified; test records rolled back' AS result;
