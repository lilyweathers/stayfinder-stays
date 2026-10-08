-- Run as administrator in SQL Editor AFTER 002_ownership.sql.
-- Creates isolated temporary test records inside a transaction and rolls back.
-- Any failed assertion aborts the script; do not remove the final ROLLBACK.
BEGIN;
INSERT INTO auth.users (id, email) VALUES
  ('a1000000-0000-4000-8000-000000000001', 'vg1-owner@example.invalid'),
  ('a1000000-0000-4000-8000-000000000002', 'vg1-guest-a@example.invalid'),
  ('a1000000-0000-4000-8000-000000000003', 'vg1-guest-b@example.invalid');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
INSERT INTO public.properties (property_id, title, description, location, price_per_night, max_guests)
VALUES ('b1000000-0000-4000-8000-000000000001', 'VG1 test stay', 'Rollback-only fixture', 'Test', 100, 2);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.properties WHERE property_id = 'b1000000-0000-4000-8000-000000000001'
    AND owner_id = auth.uid()) THEN RAISE EXCEPTION 'Owner default failed'; END IF;
END $$;

SELECT set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
INSERT INTO public.bookings (booking_id, property_id, guest_name, guest_email, check_in, check_out, guests, status)
VALUES ('c1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'Guest A', 'vg1-guest-a@example.invalid', '2099-01-01', '2099-01-03', 1, 'pending');
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE booking_id = 'c1000000-0000-4000-8000-000000000001'
    AND guest_id = auth.uid()) THEN RAISE EXCEPTION 'Guest cannot read own booking'; END IF;
  BEGIN
    INSERT INTO public.bookings (booking_id, property_id, guest_id, guest_name, guest_email, check_in, check_out, guests, status)
    VALUES ('c1000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000003', 'Forged', 'forged@example.invalid', '2099-02-01', '2099-02-03', 1, 'pending');
    RAISE EXCEPTION 'Spoofed guest accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.properties (property_id, owner_id, title, description, location, price_per_night, max_guests)
    VALUES ('b1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000003', 'Forged stay', 'Forged owner', 'Test', 100, 2);
    RAISE EXCEPTION 'Spoofed owner accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.bookings SET guest_id = 'a1000000-0000-4000-8000-000000000003'
    WHERE booking_id = 'c1000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'Booking guest transfer accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

SELECT set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
DO $$ DECLARE affected integer; BEGIN
  IF EXISTS (SELECT 1 FROM public.bookings WHERE booking_id = 'c1000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'Guest B can see guest A booking'; END IF;
  UPDATE public.properties SET title = 'Unauthorized' WHERE property_id = 'b1000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Nonowner updated property'; END IF;
  DELETE FROM public.properties WHERE property_id = 'b1000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Nonowner deleted property'; END IF;
  UPDATE public.bookings SET guest_name = 'Unauthorized' WHERE booking_id = 'c1000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Unrelated guest updated booking'; END IF;
  DELETE FROM public.bookings WHERE booking_id = 'c1000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Unrelated guest deleted booking'; END IF;
END $$;

SELECT set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE booking_id = 'c1000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'Host cannot see property booking'; END IF;
  BEGIN
    UPDATE public.properties SET owner_id = 'a1000000-0000-4000-8000-000000000003'
    WHERE property_id = 'b1000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'Property ownership transfer accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  UPDATE public.properties SET title = 'Owner updated' WHERE property_id = 'b1000000-0000-4000-8000-000000000001';
  IF NOT FOUND THEN RAISE EXCEPTION 'Owner update denied'; END IF;
  UPDATE public.bookings SET guest_name = 'Host updated' WHERE booking_id = 'c1000000-0000-4000-8000-000000000001';
  IF NOT FOUND THEN RAISE EXCEPTION 'Host booking update denied'; END IF;
END $$;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.properties WHERE property_id = 'b1000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'Public property read denied'; END IF;
  IF EXISTS (SELECT 1 FROM public.bookings WHERE booking_id = 'c1000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'Anonymous booking read allowed'; END IF;
END $$;

RESET ROLE;
ROLLBACK;
