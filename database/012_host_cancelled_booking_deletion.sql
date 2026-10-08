-- Apply after 011. Hosts may delete cancelled bookings only before check-in passes.
BEGIN;
CREATE OR REPLACE FUNCTION public.protect_booking_cancellation()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF OLD.check_in::date < (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Stockholm')::date THEN
      RAISE EXCEPTION 'Bookings with past check-in dates cannot be edited or deleted' USING ERRCODE = '23514';
    END IF;
    IF OLD.status = 'cancelled' THEN
      IF TG_OP <> 'DELETE' THEN
        RAISE EXCEPTION 'Cancelled bookings cannot be edited' USING ERRCODE = '23514';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.properties p
        WHERE p.property_id = OLD.property_id AND p.owner_id = auth.uid()) THEN
        RAISE EXCEPTION 'Only the property owner can delete cancelled bookings' USING ERRCODE = '42501';
      END IF;
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status NOT IN ('pending', 'confirmed') THEN
      RAISE EXCEPTION 'Only pending or confirmed bookings can be cancelled' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
NOTIFY pgrst, 'reload schema';
COMMIT;
