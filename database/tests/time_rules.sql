-- Run as administrator after 022. All fixtures are rolled back.
BEGIN;
-- Session timezone must not determine the booking calendar date.
SET LOCAL TIME ZONE 'Pacific/Honolulu';
DO $$ DECLARE instant timestamptz; expected date; BEGIN
 FOR instant, expected IN VALUES
  ('2027-01-01 22:59:59+00'::timestamptz, DATE '2027-01-01'),
  ('2027-01-01 23:00:00+00'::timestamptz, DATE '2027-01-02'),
  ('2027-07-01 21:59:59+00'::timestamptz, DATE '2027-07-01'),
  ('2027-07-01 22:00:00+00'::timestamptz, DATE '2027-07-02'),
  ('2027-03-28 00:59:59+00'::timestamptz, DATE '2027-03-28'),
  ('2027-03-28 01:00:00+00'::timestamptz, DATE '2027-03-28'),
  ('2027-10-31 00:59:59+00'::timestamptz, DATE '2027-10-31'),
  ('2027-10-31 01:00:00+00'::timestamptz, DATE '2027-10-31')
 LOOP
  IF public.booking_calendar_date(instant) <> expected THEN RAISE EXCEPTION 'Stockholm boundary failed: %', instant; END IF;
 END LOOP;
END $$;
INSERT INTO auth.users (id, email) VALUES
 ('a2200000-0000-4000-8000-000000000001', 'time-host@example.invalid'),
 ('a2200000-0000-4000-8000-000000000002', 'time-guest@example.invalid');
INSERT INTO public.properties (property_id, owner_id, title, description, location, price_per_night, max_guests)
VALUES ('b2200000-0000-4000-8000-000000000001', 'a2200000-0000-4000-8000-000000000001', 'Time fixture', 'Rollback only', 'Test', 100, 2);
-- Administrator inserts retained history; normal participants cannot mutate it.
INSERT INTO public.bookings (booking_id, property_id, guest_id, guest_name, guest_email, check_in, check_out, guests, status)
VALUES ('c2200000-0000-4000-8000-000000000001', 'b2200000-0000-4000-8000-000000000001', 'a2200000-0000-4000-8000-000000000002', 'History', 'time-guest@example.invalid', public.booking_calendar_date() - 2, public.booking_calendar_date() - 1, 1, 'pending');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"a2200000-0000-4000-8000-000000000002","role":"authenticated"}', true);
DO $$ BEGIN
 BEGIN
  INSERT INTO public.bookings (property_id, guest_name, guest_email, check_in, check_out, guests, status)
  VALUES ('b2200000-0000-4000-8000-000000000001', 'Guest', 'time-guest@example.invalid', public.booking_calendar_date() - 1, public.booking_calendar_date(), 1, 'pending');
  RAISE EXCEPTION 'Past check-in accepted';
 EXCEPTION WHEN check_violation THEN
  IF SQLERRM <> 'Check-in cannot be in the past' THEN RAISE; END IF;
 END;
END $$;
INSERT INTO public.bookings (booking_id, property_id, guest_name, guest_email, check_in, check_out, guests, status) VALUES
 ('c2200000-0000-4000-8000-000000000002', 'b2200000-0000-4000-8000-000000000001', 'Today', 'time-guest@example.invalid', public.booking_calendar_date(), public.booking_calendar_date() + 1, 1, 'pending'),
 ('c2200000-0000-4000-8000-000000000003', 'b2200000-0000-4000-8000-000000000001', 'Future', 'time-guest@example.invalid', public.booking_calendar_date() + 3, public.booking_calendar_date() + 4, 1, 'pending');
DO $$ DECLARE actor text; BEGIN
 FOREACH actor IN ARRAY ARRAY['a2200000-0000-4000-8000-000000000002', 'a2200000-0000-4000-8000-000000000001'] LOOP
  PERFORM set_config('request.jwt.claims', json_build_object('sub', actor, 'role', 'authenticated')::text, true);
  BEGIN
   UPDATE public.bookings SET guest_name = 'Forbidden' WHERE booking_id = 'c2200000-0000-4000-8000-000000000001';
   RAISE EXCEPTION 'Past detail edit accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
   UPDATE public.bookings SET status = 'cancelled' WHERE booking_id = 'c2200000-0000-4000-8000-000000000001';
   RAISE EXCEPTION 'Past cancellation accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
   UPDATE public.bookings SET check_in = public.booking_calendar_date() + 6, check_out = public.booking_calendar_date() + 7
    WHERE booking_id = 'c2200000-0000-4000-8000-000000000001';
   RAISE EXCEPTION 'Past booking moved forward';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
   UPDATE public.bookings SET check_in = public.booking_calendar_date() - 1
    WHERE booking_id = 'c2200000-0000-4000-8000-000000000003';
   RAISE EXCEPTION 'Future booking moved into past';
  EXCEPTION WHEN check_violation THEN
   IF SQLERRM <> 'Check-in cannot be in the past' THEN RAISE; END IF;
  END;
 END LOOP;
 UPDATE public.bookings SET guest_name = 'Allowed today' WHERE booking_id = 'c2200000-0000-4000-8000-000000000002';
 IF NOT FOUND THEN RAISE EXCEPTION 'Same-day edit denied'; END IF;
 UPDATE public.bookings SET status = 'cancelled' WHERE booking_id = 'c2200000-0000-4000-8000-000000000002';
 IF NOT FOUND THEN RAISE EXCEPTION 'Same-day cancellation denied'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE booking_id = 'c2200000-0000-4000-8000-000000000001' AND guest_name = 'History' AND status = 'pending') THEN
  RAISE EXCEPTION 'Rejected mutations changed history';
 END IF;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS: Stockholm midnight/DST boundaries, past create/update/cancel protection, today/future acceptance; fixtures rolled back' AS result;
