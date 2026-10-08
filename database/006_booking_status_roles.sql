-- Apply after 002 and 004. Enforce confirmation through every write path.
BEGIN;
CREATE OR REPLACE FUNCTION public.protect_booking_status_roles()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status IS DISTINCT FROM 'pending' THEN
        RAISE EXCEPTION 'New bookings must be pending' USING ERRCODE = '23514';
      END IF;
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
      IF OLD.status = 'pending' AND NEW.status = 'confirmed' THEN
        IF NOT EXISTS (SELECT 1 FROM public.properties p WHERE p.property_id = OLD.property_id AND p.owner_id = auth.uid()) THEN
          RAISE EXCEPTION 'Only the property owner can confirm bookings' USING ERRCODE = '42501';
        END IF;
      ELSIF OLD.status IN ('pending', 'confirmed') AND NEW.status = 'cancelled' THEN
        -- Participant RLS checks who may cancel; 004 checks past/cancelled rows.
        NULL;
      ELSE
        RAISE EXCEPTION 'Booking status transition is not allowed' USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_booking_status_roles ON public.bookings;
CREATE TRIGGER protect_booking_status_roles BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.protect_booking_status_roles();
NOTIFY pgrst, 'reload schema';
COMMIT;
