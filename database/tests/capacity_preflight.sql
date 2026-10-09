-- Read-only administrator preflight. Both result sets should be empty.
SELECT property_id, max_guests FROM public.properties
WHERE max_guests IS NULL OR max_guests < 1 OR max_guests <> trunc(max_guests);
SELECT b.booking_id, b.property_id, b.guests, p.max_guests, b.check_in, b.status
FROM public.bookings b JOIN public.properties p USING (property_id)
WHERE b.status IN ('pending', 'confirmed')
  AND b.check_in >= (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Stockholm')::date
  AND (b.guests IS NULL OR b.guests < 1 OR b.guests <> trunc(b.guests) OR b.guests > p.max_guests);
