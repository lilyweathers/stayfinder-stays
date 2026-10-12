-- Apply after 001_auth_rls.sql. Existing rows are retained without guessed owners.
-- Run as database administrator in Supabase SQL Editor, then map legacy owners.
BEGIN;

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS guest_id uuid REFERENCES auth.users(id);
ALTER TABLE public.properties ALTER COLUMN owner_id SET DEFAULT auth.uid();
ALTER TABLE public.bookings ALTER COLUMN guest_id SET DEFAULT auth.uid();
CREATE INDEX IF NOT EXISTS properties_owner_id_idx ON public.properties(owner_id);
CREATE INDEX IF NOT EXISTS bookings_guest_id_idx ON public.bookings(guest_id);
CREATE INDEX IF NOT EXISTS bookings_property_id_idx ON public.bookings(property_id);

-- Replace ALL existing policies: permissive policies combine with OR, so a
-- surviving lesson/custom allow-all policy would bypass ownership restrictions.
DO $$
DECLARE policy_record record;
BEGIN
  FOR policy_record IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('properties', 'bookings')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', policy_record.policyname, policy_record.tablename);
  END LOOP;
END;
$$;

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
-- Vg1: RLS kontrollerar åtkomsten i databasen även vid direkta klientanrop.
-- auth.uid() hämtar användarens ID från den autentiserade anropets identitet.
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY properties_select_public ON public.properties
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY properties_insert_owner ON public.properties
  -- Ett nytt boende måste tillhöra användaren som gör anropet.
  FOR INSERT TO authenticated WITH CHECK (owner_id = (SELECT auth.uid()));
CREATE POLICY properties_update_owner ON public.properties
  FOR UPDATE TO authenticated USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));
CREATE POLICY properties_delete_owner ON public.properties
  FOR DELETE TO authenticated USING (owner_id = (SELECT auth.uid()));

-- A guest sees their own bookings; a host sees all bookings for their property.
CREATE POLICY bookings_select_participant ON public.bookings
  -- Bokningen är synlig för dess gäst eller ägaren till det bokade boendet.
  FOR SELECT TO authenticated USING (
    guest_id = (SELECT auth.uid()) OR EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.property_id = bookings.property_id AND p.owner_id = (SELECT auth.uid())
    )
  );
CREATE POLICY bookings_insert_guest ON public.bookings
  FOR INSERT TO authenticated WITH CHECK (guest_id = (SELECT auth.uid()));
CREATE POLICY bookings_update_participant ON public.bookings
  FOR UPDATE TO authenticated USING (
    guest_id = (SELECT auth.uid()) OR EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.property_id = bookings.property_id AND p.owner_id = (SELECT auth.uid())
    )
  ) WITH CHECK (
    guest_id = (SELECT auth.uid()) OR EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.property_id = bookings.property_id AND p.owner_id = (SELECT auth.uid())
    )
  );
CREATE POLICY bookings_delete_participant ON public.bookings
  FOR DELETE TO authenticated USING (
    guest_id = (SELECT auth.uid()) OR EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.property_id = bookings.property_id AND p.owner_id = (SELECT auth.uid())
    )
  );

-- RLS validates rows, but participants must not transfer ownership or move a
-- booking to another host's property. Administrators can backfill legacy rows.
CREATE OR REPLACE FUNCTION public.protect_stayfinder_ownership()
-- Vg1: Triggerfunktionen körs före INSERT och UPDATE. Den hindrar vanliga
-- användare från att förfalska ägarskap, byta identitetsfält eller flytta
-- en befintlig bokning till ett annat boende. Administratörer kan hantera historik.
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_TABLE_NAME = 'properties' THEN
      IF TG_OP = 'INSERT' THEN
        IF NEW.owner_id IS DISTINCT FROM auth.uid() OR auth.uid() IS NULL THEN
          RAISE EXCEPTION 'Property owner must be the current user' USING ERRCODE = '42501';
        END IF;
      ELSIF NEW.owner_id IS DISTINCT FROM OLD.owner_id
        OR NEW.property_id IS DISTINCT FROM OLD.property_id THEN
        RAISE EXCEPTION 'Property identity and ownership cannot be changed' USING ERRCODE = '42501';
      END IF;
    ELSE
      IF TG_OP = 'INSERT' THEN
        IF NEW.guest_id IS DISTINCT FROM auth.uid() OR auth.uid() IS NULL THEN
          RAISE EXCEPTION 'Booking guest must be the current user' USING ERRCODE = '42501';
        END IF;
      ELSIF NEW.guest_id IS DISTINCT FROM OLD.guest_id
        OR NEW.property_id IS DISTINCT FROM OLD.property_id
        OR NEW.booking_id IS DISTINCT FROM OLD.booking_id THEN
        RAISE EXCEPTION 'Booking identity, guest and property cannot be changed' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_property_ownership ON public.properties;
CREATE TRIGGER protect_property_ownership BEFORE INSERT OR UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.protect_stayfinder_ownership();
DROP TRIGGER IF EXISTS protect_booking_ownership ON public.bookings;
CREATE TRIGGER protect_booking_ownership BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.protect_stayfinder_ownership();

NOTIFY pgrst, 'reload schema';
COMMIT;
