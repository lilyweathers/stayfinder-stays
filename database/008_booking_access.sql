-- Apply after ownership migrations. Protect against old permissive allow-all
-- booking policies: restrictive policies combine with them using AND.
BEGIN;
DROP POLICY IF EXISTS bookings_participant_select_guard ON public.bookings;
CREATE POLICY bookings_participant_select_guard ON public.bookings AS RESTRICTIVE
  FOR SELECT TO anon, authenticated USING (
    guest_id = (SELECT auth.uid()) OR EXISTS (
      SELECT 1 FROM public.properties p WHERE p.property_id = bookings.property_id AND p.owner_id = (SELECT auth.uid())
    )
  );
DROP POLICY IF EXISTS bookings_guest_insert_guard ON public.bookings;
CREATE POLICY bookings_guest_insert_guard ON public.bookings AS RESTRICTIVE
  FOR INSERT TO anon, authenticated WITH CHECK (guest_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS bookings_participant_update_guard ON public.bookings;
CREATE POLICY bookings_participant_update_guard ON public.bookings AS RESTRICTIVE
  FOR UPDATE TO anon, authenticated USING (
    guest_id = (SELECT auth.uid()) OR EXISTS (
      SELECT 1 FROM public.properties p WHERE p.property_id = bookings.property_id AND p.owner_id = (SELECT auth.uid())
    )
  ) WITH CHECK (
    guest_id = (SELECT auth.uid()) OR EXISTS (
      SELECT 1 FROM public.properties p WHERE p.property_id = bookings.property_id AND p.owner_id = (SELECT auth.uid())
    )
  );
DROP POLICY IF EXISTS bookings_participant_delete_guard ON public.bookings;
CREATE POLICY bookings_participant_delete_guard ON public.bookings AS RESTRICTIVE
  FOR DELETE TO anon, authenticated USING (
    guest_id = (SELECT auth.uid()) OR EXISTS (
      SELECT 1 FROM public.properties p WHERE p.property_id = bookings.property_id AND p.owner_id = (SELECT auth.uid())
    )
  );
COMMIT;
