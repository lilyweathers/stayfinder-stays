-- Run after 012 as administrator. Test fixtures roll back.
BEGIN;
INSERT INTO auth.users (id,email) VALUES
('a1200000-0000-4000-8000-000000000001','delete-host@example.invalid'),
('a1200000-0000-4000-8000-000000000002','delete-guest@example.invalid'),
('a1200000-0000-4000-8000-000000000003','delete-other@example.invalid');
INSERT INTO public.properties (property_id,owner_id,title,description,location,price_per_night,max_guests)
VALUES ('b1200000-0000-4000-8000-000000000001','a1200000-0000-4000-8000-000000000001','Deletion fixture','Rollback only','Test',100,2);
INSERT INTO public.bookings (booking_id,property_id,guest_id,guest_name,guest_email,check_in,check_out,guests,status) VALUES
('c1200000-0000-4000-8000-000000000001','b1200000-0000-4000-8000-000000000001','a1200000-0000-4000-8000-000000000002','Guest','delete-guest@example.invalid','2099-01-01','2099-01-03',1,'cancelled'),
('c1200000-0000-4000-8000-000000000002','b1200000-0000-4000-8000-000000000001','a1200000-0000-4000-8000-000000000002','Guest','delete-guest@example.invalid','2000-01-01','2000-01-03',1,'cancelled');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"a1200000-0000-4000-8000-000000000003","role":"authenticated"}',true);
DO $$ DECLARE affected integer; BEGIN
  DELETE FROM public.bookings WHERE booking_id='c1200000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>0 THEN RAISE EXCEPTION 'Unrelated user deleted booking'; END IF;
END $$;
SELECT set_config('request.jwt.claims','{"sub":"a1200000-0000-4000-8000-000000000002","role":"authenticated"}',true);
DO $$ BEGIN
  BEGIN
    DELETE FROM public.bookings WHERE booking_id='c1200000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'Guest deleted cancelled booking';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claims','{"sub":"a1200000-0000-4000-8000-000000000001","role":"authenticated"}',true);
DO $$ BEGIN
  BEGIN
    UPDATE public.bookings SET guest_name='Changed' WHERE booking_id='c1200000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'Host edited cancelled booking';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    DELETE FROM public.bookings WHERE booking_id='c1200000-0000-4000-8000-000000000002';
    RAISE EXCEPTION 'Host deleted past booking';
  EXCEPTION WHEN check_violation THEN NULL; END;
  DELETE FROM public.bookings WHERE booking_id='c1200000-0000-4000-8000-000000000001';
  IF NOT FOUND THEN RAISE EXCEPTION 'Host future cancelled deletion denied'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS: host cancelled-booking deletion verified; fixtures rolled back' AS result;
