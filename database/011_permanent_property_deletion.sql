-- Run after 010 as administrator. Permanently removes property rows, NOT bookings.
-- Also removes previously archived properties (deleted_at IS NOT NULL).
BEGIN;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS deleted_property_title text;

-- property_id becomes a historical reference. The existing BEFORE INSERT
-- require_active_booking_property trigger validates and locks live properties.
-- Ownership protection prevents clients from moving bookings to another property.
DO $$ DECLARE fk record; BEGIN
  FOR fk IN SELECT c.conname FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f' AND c.conrelid = 'public.bookings'::regclass
      AND c.confrelid = 'public.properties'::regclass
      AND cardinality(c.conkey) = 1 AND a.attname = 'property_id'
  LOOP EXECUTE format('ALTER TABLE public.bookings DROP CONSTRAINT %I', fk.conname); END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.preserve_deleted_property_bookings()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.bookings SET deleted_property_title = OLD.title,
    status = CASE WHEN status IN ('pending', 'confirmed')
      AND check_in::date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Stockholm')::date
      THEN 'cancelled' ELSE status END
    WHERE property_id = OLD.property_id;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.preserve_deleted_property_bookings() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS preserve_deleted_property_bookings ON public.properties;
CREATE TRIGGER preserve_deleted_property_bookings BEFORE DELETE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.preserve_deleted_property_bookings();

CREATE OR REPLACE FUNCTION public.delete_property(p_property_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE property_record public.properties%ROWTYPE; cancelled_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO property_record FROM public.properties
    WHERE property_id = p_property_id AND owner_id = auth.uid() AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  UPDATE public.bookings SET status = 'cancelled'
    WHERE property_id = p_property_id AND status IN ('pending', 'confirmed')
      AND check_in::date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Stockholm')::date;
  GET DIAGNOSTICS cancelled_count = ROW_COUNT;
  DELETE FROM public.properties WHERE property_id = p_property_id;
  RETURN jsonb_build_object('property', to_jsonb(property_record), 'cancelled_bookings', cancelled_count);
END;
$$;
REVOKE ALL ON FUNCTION public.delete_property(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_property(uuid) TO authenticated;

-- Replace the existing account-deletion trigger function; keep its trigger intact.
CREATE OR REPLACE FUNCTION public.archive_deleted_user_properties()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM p.property_id FROM public.properties p WHERE p.owner_id = OLD.id
    ORDER BY p.property_id FOR UPDATE;
  DELETE FROM public.properties WHERE owner_id = OLD.id;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.archive_deleted_user_properties() FROM PUBLIC, anon, authenticated;

-- Clear old soft-deleted rows, including those whose account is already gone.
-- The deletion trigger preserves their booking history and titles.
DELETE FROM public.properties WHERE deleted_at IS NOT NULL;
NOTIFY pgrst, 'reload schema';
COMMIT;
