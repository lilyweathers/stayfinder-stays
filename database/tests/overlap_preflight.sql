-- Read-only administrator review before 019; returns IDs/dates, no guest details.
-- Empty results mean no invalid intervals or active overlaps were found.
SELECT booking_id, property_id, check_in, check_out, status
FROM public.bookings
WHERE check_in IS NULL OR check_out IS NULL OR check_out::date <= check_in::date;

SELECT a.property_id, a.booking_id AS booking_a, b.booking_id AS booking_b,
  a.check_in AS a_check_in, a.check_out AS a_check_out,
  b.check_in AS b_check_in, b.check_out AS b_check_out
FROM public.bookings a JOIN public.bookings b
  ON a.property_id = b.property_id AND a.booking_id < b.booking_id
  AND a.check_in::date < b.check_out::date AND b.check_in::date < a.check_out::date
WHERE a.status IN ('pending', 'confirmed') AND b.status IN ('pending', 'confirmed')
ORDER BY a.property_id, a.check_in;
