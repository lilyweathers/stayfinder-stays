-- Read-only preview: legacy totals use today's stored property rate because
-- the original booked rate was never recorded. Review before migration 023.
SELECT b.booking_id, b.property_id, b.check_in, b.check_out,
  round(p.price_per_night::numeric, 2) AS backfill_nightly_price,
  (b.check_out - b.check_in) * round(p.price_per_night::numeric, 2) AS backfill_total_price
FROM public.bookings b LEFT JOIN public.properties p USING (property_id)
ORDER BY b.booking_id;

-- Must be empty. Missing/deleted property history cannot be priced by guessing.
SELECT b.booking_id, b.property_id FROM public.bookings b
LEFT JOIN public.properties p USING (property_id)
WHERE p.property_id IS NULL OR p.price_per_night IS NULL
  OR p.price_per_night < 0 OR p.price_per_night::numeric::text IN ('NaN', 'Infinity', '-Infinity')
  OR round(p.price_per_night::numeric, 2) > 999999999999.99
  OR b.check_in IS NULL OR b.check_out IS NULL OR b.check_out <= b.check_in
  OR (b.check_out - b.check_in) * round(p.price_per_night::numeric, 2) > 90071992547409.91;
