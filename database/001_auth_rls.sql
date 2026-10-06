-- Lesson version: all authenticated users share access; no ownership filtering.
-- Review existing policies first: permissive policies are combined with OR.
BEGIN;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS properties_select_public ON public.properties;
CREATE POLICY properties_select_public ON public.properties FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS properties_insert_authenticated ON public.properties;
CREATE POLICY properties_insert_authenticated ON public.properties FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS properties_update_authenticated ON public.properties;
CREATE POLICY properties_update_authenticated ON public.properties FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS properties_delete_authenticated ON public.properties;
CREATE POLICY properties_delete_authenticated ON public.properties FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS bookings_select_authenticated ON public.bookings;
CREATE POLICY bookings_select_authenticated ON public.bookings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS bookings_insert_authenticated ON public.bookings;
CREATE POLICY bookings_insert_authenticated ON public.bookings FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS bookings_update_authenticated ON public.bookings;
CREATE POLICY bookings_update_authenticated ON public.bookings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS bookings_delete_authenticated ON public.bookings;
CREATE POLICY bookings_delete_authenticated ON public.bookings FOR DELETE TO authenticated USING (true);
COMMIT;
