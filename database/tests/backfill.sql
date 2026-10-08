-- Read-only verification. Run as administrator in Supabase SQL Editor.
-- No records are created, updated or deleted.
WITH target AS (
  SELECT id FROM auth.users WHERE lower(email) = 'test@gmail.com'
), original_properties AS (
  SELECT * FROM public.properties WHERE property_id::text IN (
    'dcd91068-9f88-496f-a239-305f54fdc957',
    'bc22ac54-09f5-4fd8-bb1d-55cb0313602a',
    'ba3c820e-739e-434e-92eb-9d4d9fbbb4a0',
    'a2d293be-6dbe-40d2-ae89-0c215ab2a103',
    'a86a72d7-6a61-49cf-81c1-cd173f7e81ad',
    '6e2689e7-c6d4-4d4f-a384-1bedd7d8f664'
  )
)
SELECT
  (SELECT count(*) FROM target) AS matching_accounts,
  (SELECT count(*) FROM original_properties) AS original_properties_found,
  (SELECT count(*) FROM original_properties WHERE owner_id IN (SELECT id FROM target)) AS original_properties_owned_by_test,
  (SELECT count(*) FROM public.properties WHERE owner_id IS NULL) AS unassigned_properties,
  (SELECT count(*) FROM public.bookings) AS total_bookings,
  (SELECT count(*) FROM public.bookings WHERE guest_id IN (SELECT id FROM target)) AS bookings_assigned_to_test,
  (SELECT count(*) FROM public.bookings WHERE guest_id IS NULL) AS unassigned_bookings;

-- Review these actual booking assignments. New bookings made by other accounts
-- legitimately belong to those accounts; do not reassign them to make counts match.
SELECT b.booking_id, b.check_in, b.status, u.email AS guest_account,
  p.title AS property, host.email AS property_owner_account
FROM public.bookings b
LEFT JOIN auth.users u ON u.id = b.guest_id
LEFT JOIN public.properties p ON p.property_id = b.property_id
LEFT JOIN auth.users host ON host.id = p.owner_id
ORDER BY b.booking_id;
