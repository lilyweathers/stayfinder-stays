-- Apply after 024. Public search sees availability across guest RLS without
-- returning booking identities, guest details or individual booking records.
BEGIN;
CREATE FUNCTION public.search_available_properties(
 p_check_in date, p_check_out date, p_location text DEFAULT NULL,
 p_max_price numeric DEFAULT NULL, p_guests bigint DEFAULT NULL, p_sort text DEFAULT NULL)
RETURNS SETOF public.properties LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF p_check_in IS NULL OR p_check_out IS NULL OR p_check_in < public.booking_calendar_date()
  OR NOT isfinite(p_check_in) OR NOT isfinite(p_check_out)
  OR p_check_in > DATE '9999-12-31' OR p_check_out > DATE '9999-12-31'
  OR p_check_out <= p_check_in THEN
  RAISE EXCEPTION 'Provide today/future check-in and a later check-out' USING ERRCODE = '23514';
 END IF;
 IF length(p_location) > 100 OR p_max_price < 0
  OR p_max_price::text IN ('NaN', 'Infinity', '-Infinity')
  OR p_guests < 1 OR p_guests > 9007199254740991
  OR (p_sort IS NOT NULL AND p_sort NOT IN ('asc', 'desc')) THEN
  RAISE EXCEPTION 'Invalid property search filters' USING ERRCODE = '23514';
 END IF;
 RETURN QUERY SELECT p.* FROM public.properties p
 WHERE p.deleted_at IS NULL
  AND (p_location IS NULL OR strpos(lower(p.location), lower(p_location)) > 0)
  AND (p_max_price IS NULL OR p.price_per_night <= p_max_price)
  AND (p_guests IS NULL OR p.max_guests >= p_guests)
  AND NOT EXISTS (SELECT 1 FROM public.bookings b
   WHERE b.property_id = p.property_id AND b.status IN ('pending', 'confirmed')
    AND b.check_in < p_check_out AND b.check_out > p_check_in)
 ORDER BY CASE WHEN p_sort = 'asc' THEN p.price_per_night END ASC,
  CASE WHEN p_sort = 'desc' THEN p.price_per_night END DESC, p.property_id ASC;
END;
$$;
REVOKE ALL ON FUNCTION public.search_available_properties(date,date,text,numeric,bigint,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_available_properties(date,date,text,numeric,bigint,text) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
