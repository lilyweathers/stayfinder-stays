-- Apply after 002_ownership.sql. RLS still enforces guest/host permissions.
-- Same-day check-in is allowed; dates use Europe/Stockholm in API and database.
BEGIN;
CREATE OR REPLACE FUNCTION public.protect_booking_cancellation()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF OLD.status = 'cancelled' THEN
      RAISE EXCEPTION 'Cancelled bookings cannot be edited or deleted' USING ERRCODE = '23514';
    END IF;
    IF OLD.check_in::date < (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Stockholm')::date THEN
      RAISE EXCEPTION 'Bookings with past check-in dates cannot be edited or deleted' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status NOT IN ('pending', 'confirmed') THEN
      RAISE EXCEPTION 'Only pending or confirmed bookings can be cancelled' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_booking_cancellation ON public.bookings;
CREATE TRIGGER protect_booking_cancellation BEFORE UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.protect_booking_cancellation();
NOTIFY pgrst, 'reload schema';
COMMIT;
