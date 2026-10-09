-- Apply after 020 as administrator. No existing records are modified.
BEGIN;
LOCK TABLE public.properties, public.bookings IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.properties WHERE max_guests IS NULL OR max_guests < 1 OR max_guests <> trunc(max_guests)) THEN
    RAISE EXCEPTION 'VG3: invalid existing property capacity; review records before applying';
  END IF;
  IF EXISTS (SELECT 1 FROM public.bookings b JOIN public.properties p USING (property_id)
    WHERE b.status IN ('pending', 'confirmed')
      AND b.check_in >= (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Stockholm')::date
      AND (b.guests IS NULL OR b.guests < 1 OR b.guests <> trunc(b.guests) OR b.guests > p.max_guests)) THEN
    RAISE EXCEPTION 'VG3: existing upcoming bookings exceed capacity or have invalid guest counts; run capacity_preflight.sql and review before retrying';
  END IF;
END $$;
ALTER TABLE public.properties ADD CONSTRAINT properties_valid_capacity
  CHECK (max_guests IS NOT NULL AND max_guests >= 1 AND max_guests = trunc(max_guests));

CREATE FUNCTION public.enforce_booking_capacity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE capacity numeric;
BEGIN
  -- Cancellation and deleted-property history maintenance must remain possible.
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'cancelled'
      AND NEW.guests IS NOT DISTINCT FROM OLD.guests
      AND NEW.property_id IS NOT DISTINCT FROM OLD.property_id THEN RETURN NEW; END IF;
    IF OLD.check_in < (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Stockholm')::date
      AND NEW.guests IS NOT DISTINCT FROM OLD.guests
      AND NEW.property_id IS NOT DISTINCT FROM OLD.property_id
      AND NEW.check_in IS NOT DISTINCT FROM OLD.check_in
      AND NEW.check_out IS NOT DISTINCT FROM OLD.check_out
      AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  END IF;
  IF NEW.guests IS NULL OR NEW.guests < 1 OR NEW.guests <> trunc(NEW.guests) THEN
    RAISE EXCEPTION 'Guest count must be a positive whole number' USING ERRCODE = '23514';
  END IF;
  -- SHARE conflicts with property capacity updates; regular booking writes may
  -- share this lock. The lookup runs across RLS but reveals no private data.
  SELECT p.max_guests INTO capacity FROM public.properties p
    WHERE p.property_id = NEW.property_id AND p.deleted_at IS NULL FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Active property not found' USING ERRCODE = '23503'; END IF;
  IF NEW.guests > capacity THEN
    RAISE EXCEPTION 'Guest count exceeds property capacity' USING ERRCODE = '23514', CONSTRAINT = 'bookings_capacity';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_booking_capacity() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER enforce_booking_capacity BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_capacity();

CREATE FUNCTION public.protect_property_capacity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- UPDATE already locks this property row. Booking inserts/updates obtain SHARE.
  IF NEW.max_guests < OLD.max_guests AND EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.property_id = OLD.property_id
      AND b.status IN ('pending', 'confirmed')
      AND b.check_in >= (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Stockholm')::date
      AND b.guests > NEW.max_guests
  ) THEN
    RAISE EXCEPTION 'Property capacity is below an upcoming booking' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_property_capacity() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER protect_property_capacity BEFORE UPDATE OF max_guests ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.protect_property_capacity();
NOTIFY pgrst, 'reload schema';
COMMIT;
