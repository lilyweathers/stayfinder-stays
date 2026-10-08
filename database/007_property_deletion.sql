-- Apply after 002, 004 and 006. Preserve booking history through soft deletion.
BEGIN;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- These restrictive policies remain effective alongside existing ownership policies.
DROP POLICY IF EXISTS properties_active_select ON public.properties;
CREATE POLICY properties_active_select ON public.properties AS RESTRICTIVE
  FOR SELECT TO anon, authenticated USING (deleted_at IS NULL OR owner_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS properties_active_insert ON public.properties;
CREATE POLICY properties_active_insert ON public.properties AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK (deleted_at IS NULL);
DROP POLICY IF EXISTS properties_active_update ON public.properties;
CREATE POLICY properties_active_update ON public.properties AS RESTRICTIVE
  FOR UPDATE TO authenticated USING (deleted_at IS NULL) WITH CHECK (deleted_at IS NULL);
DROP POLICY IF EXISTS properties_no_hard_delete ON public.properties;
CREATE POLICY properties_no_hard_delete ON public.properties AS RESTRICTIVE
  FOR DELETE TO authenticated USING (false);

CREATE OR REPLACE FUNCTION public.delete_property(p_property_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  property_record public.properties%ROWTYPE;
  cancelled_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO property_record FROM public.properties
    WHERE property_id = p_property_id AND owner_id = auth.uid() AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  UPDATE public.bookings SET status = 'cancelled'
    WHERE property_id = p_property_id AND status IN ('pending', 'confirmed')
    AND check_in::date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Stockholm')::date;
  GET DIAGNOSTICS cancelled_count = ROW_COUNT;
  UPDATE public.properties SET deleted_at = CURRENT_TIMESTAMP WHERE property_id = p_property_id;
  RETURN jsonb_build_object('property', to_jsonb(property_record), 'cancelled_bookings', cancelled_count);
END;
$$;
REVOKE ALL ON FUNCTION public.delete_property(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_property(uuid) TO authenticated;

-- A shared row lock serializes booking creation with deletion. All writes use
-- this trigger, including RPC/direct API calls. Archived properties cannot be booked.
CREATE OR REPLACE FUNCTION public.require_active_booking_property()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM 1 FROM public.properties WHERE property_id = NEW.property_id AND deleted_at IS NULL FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Property is no longer available' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS require_active_booking_property ON public.bookings;
CREATE TRIGGER require_active_booking_property BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.require_active_booking_property();

NOTIFY pgrst, 'reload schema';
COMMIT;
