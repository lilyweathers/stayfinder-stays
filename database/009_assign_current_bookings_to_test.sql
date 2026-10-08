-- User-requested one-time reassignment of ALL bookings present when executed.
-- Run as administrator. Do not rerun after other guests start making bookings.
-- New API bookings continue to use the signed-in guest UID.
BEGIN;
DO $$ DECLARE target_id uuid; BEGIN
  SELECT id INTO STRICT target_id FROM auth.users WHERE lower(email) = 'test@gmail.com';
  UPDATE public.bookings SET guest_id = target_id WHERE guest_id IS DISTINCT FROM target_id;
END $$;
COMMIT;
SELECT b.booking_id, b.guest_id, u.email AS guest_account
FROM public.bookings b LEFT JOIN auth.users u ON u.id = b.guest_id
ORDER BY b.booking_id;
