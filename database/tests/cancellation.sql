-- Run as database administrator after 002 and 004. All fixtures roll back.
BEGIN;
INSERT INTO auth.users (id, email) VALUES
  ('a4000000-0000-4000-8000-000000000001', 'cancel-host@example.invalid'),
  ('a4000000-0000-4000-8000-000000000002', 'cancel-guest@example.invalid'),
  ('a4000000-0000-4000-8000-000000000003', 'cancel-other@example.invalid');
INSERT INTO public.properties (property_id, owner_id, title, description, location, price_per_night, max_guests)
VALUES ('b4000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001', 'Cancellation fixture', 'Rollback only', 'Test', 100, 2);
INSERT INTO public.bookings (booking_id, property_id, guest_id, guest_name, guest_email, check_in, check_out, guests, status)
VALUES
  ('c4000000-0000-4000-8000-000000000001', 'b4000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000002', 'Guest', 'cancel-guest@example.invalid', '2099-01-01', '2099-01-03', 1, 'pending'),
  ('c4000000-0000-4000-8000-000000000002', 'b4000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000002', 'Guest', 'cancel-guest@example.invalid', '2099-02-01', '2099-02-03', 1, 'confirmed'),
  ('c4000000-0000-4000-8000-000000000003', 'b4000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000002', 'Guest', 'cancel-guest@example.invalid', '2000-01-01', '2000-01-03', 1, 'pending');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"a4000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
DO $$ DECLARE affected integer; BEGIN
  UPDATE public.bookings SET status = 'cancelled' WHERE booking_id = 'c4000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Unrelated user cancelled booking'; END IF;
END $$;

SELECT set_config('request.jwt.claims', '{"sub":"a4000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
DO $$ BEGIN
  UPDATE public.bookings SET status = 'cancelled' WHERE booking_id = 'c4000000-0000-4000-8000-000000000001';
  IF NOT FOUND THEN RAISE EXCEPTION 'Guest cancellation denied'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE booking_id = 'c4000000-0000-4000-8000-000000000001' AND status = 'cancelled') THEN
    RAISE EXCEPTION 'Cancellation status not saved'; END IF;
  BEGIN
    UPDATE public.bookings SET status = 'pending' WHERE booking_id = 'c4000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'Cancelled booking was reopened';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    DELETE FROM public.bookings WHERE booking_id = 'c4000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'Cancelled booking was deleted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE public.bookings SET status = 'cancelled' WHERE booking_id = 'c4000000-0000-4000-8000-000000000003';
    RAISE EXCEPTION 'Past booking was cancelled';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE public.bookings SET check_in = '2099-03-01', check_out = '2099-03-03'
      WHERE booking_id = 'c4000000-0000-4000-8000-000000000003';
    RAISE EXCEPTION 'Past booking was moved to future';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;

SELECT set_config('request.jwt.claims', '{"sub":"a4000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
DO $$ BEGIN
  UPDATE public.bookings SET status = 'cancelled' WHERE booking_id = 'c4000000-0000-4000-8000-000000000002';
  IF NOT FOUND THEN RAISE EXCEPTION 'Host cancellation denied'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
