-- Administrator after 025; all fixtures roll back. Anonymous search must see
-- the availability effect of hidden bookings, without reading their details.
BEGIN;
INSERT INTO auth.users (id, email) VALUES ('a2500000-0000-4000-8000-000000000001', 'search-host@example.invalid');
INSERT INTO public.properties (property_id, owner_id, title, description, location, price_per_night, max_guests) VALUES
 ('b2500000-0000-4000-8000-000000000001', 'a2500000-0000-4000-8000-000000000001', 'Pending', 'Test', 'VG7 rollback city', 100, 4),
 ('b2500000-0000-4000-8000-000000000002', 'a2500000-0000-4000-8000-000000000001', 'Confirmed', 'Test', 'VG7 rollback city', 200, 4),
 ('b2500000-0000-4000-8000-000000000003', 'a2500000-0000-4000-8000-000000000001', 'Cancelled', 'Test', 'VG7 rollback city', 300, 4),
 ('b2500000-0000-4000-8000-000000000004', 'a2500000-0000-4000-8000-000000000001', 'Available', 'Test', 'VG7 rollback city', 400, 2),
 ('b2500000-0000-4000-8000-000000000005', 'a2500000-0000-4000-8000-000000000001', 'Deleted', 'Test', 'VG7 rollback city', 500, 4);
UPDATE public.properties SET deleted_at = CURRENT_TIMESTAMP WHERE property_id = 'b2500000-0000-4000-8000-000000000005';
INSERT INTO public.bookings (property_id, guest_id, guest_name, guest_email, check_in, check_out, guests, status) VALUES
 ('b2500000-0000-4000-8000-000000000001', 'a2500000-0000-4000-8000-000000000001', 'Guest', 'search-host@example.invalid', '2099-01-10', '2099-01-14', 1, 'pending'),
 ('b2500000-0000-4000-8000-000000000002', 'a2500000-0000-4000-8000-000000000001', 'Guest', 'search-host@example.invalid', '2099-01-10', '2099-01-14', 1, 'confirmed'),
 ('b2500000-0000-4000-8000-000000000003', 'a2500000-0000-4000-8000-000000000001', 'Guest', 'search-host@example.invalid', '2099-01-10', '2099-01-14', 1, 'cancelled');
SET LOCAL ROLE anon;
DO $$ DECLARE prices numeric[]; first_date date; last_date date; BEGIN
 SELECT array_agg(price_per_night) INTO prices FROM public.search_available_properties('2099-01-10', '2099-01-14', 'vg7 ROLLBACK city', NULL, NULL, 'asc');
 IF prices IS DISTINCT FROM ARRAY[300,400]::numeric[] THEN RAISE EXCEPTION 'Overlap/cancelled/deleted search failed: %', prices; END IF;
 SELECT array_agg(price_per_night) INTO prices FROM public.search_available_properties('2099-01-10', '2099-01-14', 'VG7 rollback city', 400, 2, 'desc');
 IF prices IS DISTINCT FROM ARRAY[400,300]::numeric[] THEN RAISE EXCEPTION 'Descending combined filters failed'; END IF;
 SELECT array_agg(price_per_night) INTO prices FROM public.search_available_properties('2099-01-10', '2099-01-14', 'VG7 rollback city', 350, 4, 'asc');
 IF prices IS DISTINCT FROM ARRAY[300]::numeric[] THEN RAISE EXCEPTION 'Price/capacity combined filter failed'; END IF;
 FOR first_date, last_date IN VALUES (DATE '2099-01-08', DATE '2099-01-10'), (DATE '2099-01-14', DATE '2099-01-16') LOOP
  IF (SELECT count(*) FROM public.search_available_properties(first_date, last_date, 'VG7 rollback city')) <> 4 THEN
   RAISE EXCEPTION 'Adjacent stay rejected';
  END IF;
 END LOOP;
 FOR first_date, last_date IN VALUES (DATE '2099-01-11', DATE '2099-01-12'), (DATE '2099-01-09', DATE '2099-01-15'), (DATE '2099-01-09', DATE '2099-01-11'), (DATE '2099-01-13', DATE '2099-01-15') LOOP
  IF (SELECT count(*) FROM public.search_available_properties(first_date, last_date, 'VG7 rollback city')) <> 2 THEN
   RAISE EXCEPTION 'Overlapping interval returned blocked properties';
  END IF;
 END LOOP;
 FOR first_date, last_date IN VALUES (NULL::date, DATE '2099-01-14'), (DATE '2099-01-10', NULL::date),
  (DATE '2099-01-10', DATE '2099-01-10'), (DATE '2099-01-14', DATE '2099-01-10'), (DATE '2000-01-01', DATE '2099-01-14') LOOP
  BEGIN
   PERFORM * FROM public.search_available_properties(first_date, last_date);
   RAISE EXCEPTION 'Invalid direct search dates accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
 END LOOP;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS: public availability, pending/confirmed/cancelled, adjacent stays, filters/sorting, invalid dates; fixtures rolled back' AS result;
