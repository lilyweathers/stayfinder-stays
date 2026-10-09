-- Public calendar availability without exposing booking IDs or guest details.
-- Apply after 019. Existing booking RLS stays intact.
BEGIN;
CREATE OR REPLACE FUNCTION public.get_property_availability(p_property_id text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE((
    SELECT jsonb_agg(jsonb_build_object('check_in', dates.check_in, 'check_out', dates.check_out)
      ORDER BY dates.check_in, dates.check_out)
    FROM (
      SELECT DISTINCT b.check_in, b.check_out FROM public.bookings b
      WHERE b.property_id::text = p_property_id
        AND b.status IN ('pending', 'confirmed')
        AND b.check_out > (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Stockholm')::date
    ) dates
  ), '[]'::jsonb)
  FROM public.properties p
  WHERE p.property_id::text = p_property_id AND p.deleted_at IS NULL;
$$;
REVOKE ALL ON FUNCTION public.get_property_availability(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_property_availability(text) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
