-- Run as administrator in Supabase SQL Editor after 002_ownership.sql.
-- Transfer only the six original properties. Booking guests remain unchanged.
-- The transaction fails if the host account or any original property is missing.
BEGIN;
DO $$
DECLARE
  host_id uuid;
  assigned_count integer;
BEGIN
  SELECT id INTO STRICT host_id FROM auth.users WHERE lower(email) = 'host@gmail.com';
  UPDATE public.properties SET owner_id = host_id WHERE property_id::text IN (
    'dcd91068-9f88-496f-a239-305f54fdc957',
    'bc22ac54-09f5-4fd8-bb1d-55cb0313602a',
    'ba3c820e-739e-434e-92eb-9d4d9fbbb4a0',
    'a2d293be-6dbe-40d2-ae89-0c215ab2a103',
    'a86a72d7-6a61-49cf-81c1-cd173f7e81ad',
    '6e2689e7-c6d4-4d4f-a384-1bedd7d8f664'
  );
  GET DIAGNOSTICS assigned_count = ROW_COUNT;
  IF assigned_count <> 6 THEN
    RAISE EXCEPTION 'Expected six original properties, found %; transfer rolled back', assigned_count;
  END IF;
END;
$$;
COMMIT;

SELECT p.property_id, p.title, u.email AS owner_account
FROM public.properties p JOIN auth.users u ON u.id = p.owner_id
WHERE p.property_id::text IN (
  'dcd91068-9f88-496f-a239-305f54fdc957',
  'bc22ac54-09f5-4fd8-bb1d-55cb0313602a',
  'ba3c820e-739e-434e-92eb-9d4d9fbbb4a0',
  'a2d293be-6dbe-40d2-ae89-0c215ab2a103',
  'a86a72d7-6a61-49cf-81c1-cd173f7e81ad',
  '6e2689e7-c6d4-4d4f-a384-1bedd7d8f664'
)
ORDER BY p.title;
