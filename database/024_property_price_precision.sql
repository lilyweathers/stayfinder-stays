-- Apply after 023, including installations that applied its original version.
-- Integer property rates rounded SQL literals and rejected decimal API writes.
-- Existing property amounts and saved booking prices remain unchanged.
BEGIN;
ALTER TABLE public.properties ALTER COLUMN price_per_night TYPE numeric(14,2)
 USING price_per_night::numeric(14,2);
NOTIFY pgrst, 'reload schema';
COMMIT;
