-- Apply after 007. Run as administrator in Supabase SQL Editor.
-- Account deletion archives owned properties; booking history is preserved.
BEGIN;

-- Replace the ownership FKs, including differently named existing constraints.
DO $$ DECLARE fk record; BEGIN
  FOR fk IN
    SELECT c.conrelid::regclass AS relation, c.conname
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f' AND c.confrelid = 'auth.users'::regclass
      AND cardinality(c.conkey) = 1
      AND ((c.conrelid = 'public.properties'::regclass AND a.attname = 'owner_id')
        OR (c.conrelid = 'public.bookings'::regclass AND a.attname = 'guest_id'))
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', fk.relation, fk.conname);
  END LOOP;
END $$;
ALTER TABLE public.properties ADD CONSTRAINT properties_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_guest_id_fkey
  FOREIGN KEY (guest_id) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.archive_deleted_user_properties()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- Use the same property lock as deletion/booking creation to serialize writes.
  PERFORM p.property_id FROM public.properties p WHERE p.owner_id = OLD.id
    ORDER BY p.property_id FOR UPDATE;
  UPDATE public.bookings b SET status = 'cancelled'
    WHERE b.status IN ('pending', 'confirmed')
      AND b.check_in::date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Stockholm')::date
      AND EXISTS (SELECT 1 FROM public.properties p
        WHERE p.property_id = b.property_id AND p.owner_id = OLD.id);
  UPDATE public.properties SET deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP)
    WHERE owner_id = OLD.id;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.archive_deleted_user_properties() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS archive_deleted_user_properties ON auth.users;
CREATE TRIGGER archive_deleted_user_properties BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.archive_deleted_user_properties();

NOTIFY pgrst, 'reload schema';
COMMIT;
