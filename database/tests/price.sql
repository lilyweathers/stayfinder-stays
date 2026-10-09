-- Run as administrator after 023 and 024; fixtures roll back.
BEGIN;
INSERT INTO auth.users (id, email) VALUES
 ('a2300000-0000-4000-8000-000000000001', 'price-host@example.invalid'),
 ('a2300000-0000-4000-8000-000000000002', 'price-guest@example.invalid');
INSERT INTO public.properties (property_id, owner_id, title, description, location, price_per_night, max_guests)
VALUES ('b2300000-0000-4000-8000-000000000001', 'a2300000-0000-4000-8000-000000000001', 'Price fixture', 'Rollback only', 'Test', 123.45, 2);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"a2300000-0000-4000-8000-000000000002","role":"authenticated"}', true);
INSERT INTO public.bookings (booking_id, property_id, guest_name, guest_email, check_in, check_out, guests, status, nightly_price, total_price)
VALUES ('c2300000-0000-4000-8000-000000000001', 'b2300000-0000-4000-8000-000000000001', 'Guest', 'price-guest@example.invalid', '2099-01-01', '2099-01-04', 1, 'pending', 0, 1);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE booking_id = 'c2300000-0000-4000-8000-000000000001' AND nightly_price = 123.45 AND total_price = 370.35) THEN
  RAISE EXCEPTION 'Forged insert price used';
 END IF;
END $$;
SELECT set_config('request.jwt.claims', '{"sub":"a2300000-0000-4000-8000-000000000001","role":"authenticated"}', true);
UPDATE public.properties SET price_per_night = 999 WHERE property_id = 'b2300000-0000-4000-8000-000000000001';
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE booking_id = 'c2300000-0000-4000-8000-000000000001' AND nightly_price = 123.45 AND total_price = 370.35) THEN
  RAISE EXCEPTION 'Property price changed saved booking price';
 END IF;
 UPDATE public.bookings SET nightly_price = 999, total_price = 0 WHERE booking_id = 'c2300000-0000-4000-8000-000000000001';
 IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE booking_id = 'c2300000-0000-4000-8000-000000000001' AND nightly_price = 123.45 AND total_price = 370.35) THEN
  RAISE EXCEPTION 'Owner replaced trusted saved price';
 END IF;
END $$;
SELECT set_config('request.jwt.claims', '{"sub":"a2300000-0000-4000-8000-000000000002","role":"authenticated"}', true);
UPDATE public.bookings SET check_out = '2099-01-05', nightly_price = 1, total_price = 1
WHERE booking_id = 'c2300000-0000-4000-8000-000000000001';
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE booking_id = 'c2300000-0000-4000-8000-000000000001' AND nightly_price = 123.45 AND total_price = 493.80) THEN
  RAISE EXCEPTION 'Date edit did not use frozen rate';
 END IF;
END $$;
INSERT INTO public.bookings (booking_id, property_id, guest_name, guest_email, check_in, check_out, guests, status)
VALUES ('c2300000-0000-4000-8000-000000000002', 'b2300000-0000-4000-8000-000000000001', 'Guest', 'price-guest@example.invalid', '2099-02-01', '2099-02-03', 1, 'pending');
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE booking_id = 'c2300000-0000-4000-8000-000000000002' AND nightly_price = 999 AND total_price = 1998) THEN
  RAISE EXCEPTION 'New booking ignored current rate';
 END IF;
END $$;
UPDATE public.bookings SET status = 'cancelled' WHERE booking_id = 'c2300000-0000-4000-8000-000000000001';
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE booking_id = 'c2300000-0000-4000-8000-000000000001' AND total_price = 493.80) THEN
  RAISE EXCEPTION 'Cancellation changed saved total';
 END IF;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS: trusted decimal totals, forged create/update ignored, frozen rate, date recalculation and new current rate; fixtures rolled back' AS result;
