-- Run as administrator after 021. All fixtures are rolled back.
BEGIN;
INSERT INTO auth.users (id, email) VALUES
 ('a2100000-0000-4000-8000-000000000001', 'capacity-host@example.invalid'),
 ('a2100000-0000-4000-8000-000000000002', 'capacity-guest@example.invalid');
INSERT INTO public.properties (property_id, owner_id, title, description, location, price_per_night, max_guests)
VALUES ('b2100000-0000-4000-8000-000000000001', 'a2100000-0000-4000-8000-000000000001', 'Capacity fixture', 'Rollback only', 'Test', 100, 2);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"a2100000-0000-4000-8000-000000000002","role":"authenticated"}', true);
INSERT INTO public.bookings (booking_id, property_id, guest_name, guest_email, check_in, check_out, guests, status)
VALUES ('c2100000-0000-4000-8000-000000000001', 'b2100000-0000-4000-8000-000000000001', 'Guest', 'capacity-guest@example.invalid', '2099-01-10', '2099-01-12', 2, 'pending');
DO $$ BEGIN
 BEGIN
  INSERT INTO public.bookings (property_id, guest_name, guest_email, check_in, check_out, guests, status)
  VALUES ('b2100000-0000-4000-8000-000000000001', 'Guest', 'capacity-guest@example.invalid', '2099-02-10', '2099-02-12', 3, 'pending');
  RAISE EXCEPTION 'Oversized insert accepted';
 EXCEPTION WHEN check_violation THEN
  IF SQLERRM <> 'Guest count exceeds property capacity' THEN RAISE; END IF;
 END;
 BEGIN
  UPDATE public.bookings SET guests = 3 WHERE booking_id = 'c2100000-0000-4000-8000-000000000001';
  RAISE EXCEPTION 'Oversized update accepted';
 EXCEPTION WHEN check_violation THEN
  IF SQLERRM <> 'Guest count exceeds property capacity' THEN RAISE; END IF;
 END;
 IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE booking_id = 'c2100000-0000-4000-8000-000000000001' AND guests = 2) THEN
  RAISE EXCEPTION 'Failed update changed booking';
 END IF;
END $$;
SELECT set_config('request.jwt.claims', '{"sub":"a2100000-0000-4000-8000-000000000001","role":"authenticated"}', true);
DO $$ BEGIN
 BEGIN
  UPDATE public.properties SET max_guests = 1 WHERE property_id = 'b2100000-0000-4000-8000-000000000001';
  RAISE EXCEPTION 'Unsafe capacity reduction accepted';
 EXCEPTION WHEN check_violation THEN
  IF SQLERRM <> 'Property capacity is below an upcoming booking' THEN RAISE; END IF;
 END;
END $$;
SELECT set_config('request.jwt.claims', '{"sub":"a2100000-0000-4000-8000-000000000002","role":"authenticated"}', true);
UPDATE public.bookings SET guests = 1 WHERE booking_id = 'c2100000-0000-4000-8000-000000000001';
SELECT set_config('request.jwt.claims', '{"sub":"a2100000-0000-4000-8000-000000000001","role":"authenticated"}', true);
UPDATE public.properties SET max_guests = 1 WHERE property_id = 'b2100000-0000-4000-8000-000000000001';
SELECT set_config('request.jwt.claims', '{"sub":"a2100000-0000-4000-8000-000000000002","role":"authenticated"}', true);
DO $$ BEGIN
 BEGIN
  UPDATE public.bookings SET guests = 2 WHERE booking_id = 'c2100000-0000-4000-8000-000000000001';
  RAISE EXCEPTION 'Changed capacity ignored';
 EXCEPTION WHEN check_violation THEN
  IF SQLERRM <> 'Guest count exceeds property capacity' THEN RAISE; END IF;
 END;
END $$;
SELECT set_config('request.jwt.claims', '{"sub":"a2100000-0000-4000-8000-000000000001","role":"authenticated"}', true);
UPDATE public.properties SET max_guests = 3 WHERE property_id = 'b2100000-0000-4000-8000-000000000001';
SELECT set_config('request.jwt.claims', '{"sub":"a2100000-0000-4000-8000-000000000002","role":"authenticated"}', true);
UPDATE public.bookings SET guests = 3 WHERE booking_id = 'c2100000-0000-4000-8000-000000000001';
UPDATE public.bookings SET status = 'cancelled' WHERE booking_id = 'c2100000-0000-4000-8000-000000000001';
SELECT set_config('request.jwt.claims', '{"sub":"a2100000-0000-4000-8000-000000000001","role":"authenticated"}', true);
UPDATE public.properties SET max_guests = 1 WHERE property_id = 'b2100000-0000-4000-8000-000000000001';
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.properties WHERE property_id = 'b2100000-0000-4000-8000-000000000001' AND max_guests = 1) THEN
  RAISE EXCEPTION 'Cancelled booking blocked capacity change';
 END IF;
END $$;
RESET ROLE;
SELECT 'PASS: exact capacity, oversized create/update, changed capacity, protected reservations and cancellation; fixtures rolled back' AS result;
ROLLBACK;
