-- Apply after 022, after reviewing tests/price_preflight.sql.
-- Legacy bookings are initialized from the currently stored property rate.
BEGIN;
LOCK TABLE public.properties, public.bookings IN ACCESS EXCLUSIVE MODE;
-- The original lesson schema may store property rates as integer. Preserve
-- existing amounts while enabling the decimal rates already accepted by forms.
ALTER TABLE public.properties ALTER COLUMN price_per_night TYPE numeric(14,2)
 USING price_per_night::numeric(14,2);
ALTER TABLE public.bookings ADD COLUMN nightly_price numeric(14,2),
  ADD COLUMN total_price numeric(18,2);
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.bookings b LEFT JOIN public.properties p USING (property_id)
  WHERE p.property_id IS NULL OR p.price_per_night IS NULL OR p.price_per_night < 0
   OR p.price_per_night::numeric::text IN ('NaN', 'Infinity', '-Infinity')
   OR round(p.price_per_night::numeric, 2) > 999999999999.99
   OR b.check_in IS NULL OR b.check_out IS NULL OR b.check_out <= b.check_in
   OR (b.check_out - b.check_in) * round(p.price_per_night::numeric, 2) > 90071992547409.91) THEN
  RAISE EXCEPTION 'VG6: unpriceable legacy bookings; review price_preflight.sql before retrying';
 END IF;
END $$;
UPDATE public.bookings b SET nightly_price = round(p.price_per_night::numeric, 2),
  total_price = (b.check_out - b.check_in) * round(p.price_per_night::numeric, 2)
FROM public.properties p WHERE p.property_id = b.property_id;
ALTER TABLE public.bookings ALTER COLUMN nightly_price SET NOT NULL,
  ALTER COLUMN total_price SET NOT NULL,
  ADD CONSTRAINT bookings_saved_price CHECK (
    nightly_price >= 0 AND nightly_price::text <> 'NaN'
    AND total_price >= 0 AND total_price <= 90071992547409.91
    AND total_price = (check_out - check_in) * nightly_price);

CREATE FUNCTION public.save_booking_price()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE rate numeric;
BEGIN
 IF TG_OP = 'INSERT' THEN
  SELECT round(p.price_per_night::numeric, 2) INTO rate FROM public.properties p
   WHERE p.property_id = NEW.property_id AND p.deleted_at IS NULL FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Active property not found' USING ERRCODE = '23503'; END IF;
  IF rate IS NULL OR rate < 0 OR rate::text IN ('NaN', 'Infinity', '-Infinity') OR rate > 999999999999.99 THEN
   RAISE EXCEPTION 'Invalid property nightly price' USING ERRCODE = '23514';
  END IF;
  NEW.nightly_price := rate;
 ELSE
  -- Preserve the booking's rate across property changes, cancellation, history
  -- maintenance and date edits. Neither API nor direct writes may replace it.
  NEW.nightly_price := OLD.nightly_price;
 END IF;
 NEW.total_price := (NEW.check_out - NEW.check_in) * NEW.nightly_price;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.save_booking_price() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER save_booking_price BEFORE INSERT OR UPDATE ON public.bookings
 FOR EACH ROW EXECUTE FUNCTION public.save_booking_price();
NOTIFY pgrst, 'reload schema';
COMMIT;
