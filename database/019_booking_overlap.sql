-- Apply as administrator after 018. Existing records are never cancelled/deleted.
-- A conflict aborts the entire transaction; run ROLLBACK before retrying.
BEGIN;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;
LOCK TABLE public.bookings IN ACCESS EXCLUSIVE MODE;

-- Native dates keep the range index immutable and independent of session timezone.
-- Existing ISO calendar dates retain their values. Invalid legacy data aborts.
ALTER TABLE public.bookings
  ALTER COLUMN check_in TYPE date USING check_in::date,
  ALTER COLUMN check_out TYPE date USING check_out::date;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.bookings
    WHERE check_in IS NULL OR check_out IS NULL OR check_out <= check_in) THEN
    RAISE EXCEPTION 'VG2: existing bookings have missing or invalid date intervals. Review records before applying; no records were changed.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.bookings a JOIN public.bookings b
      ON a.property_id = b.property_id AND a.booking_id < b.booking_id
      AND a.check_in < b.check_out AND b.check_in < a.check_out
    WHERE a.status IN ('pending', 'confirmed') AND b.status IN ('pending', 'confirmed')
  ) THEN
    RAISE EXCEPTION 'VG2: existing active bookings overlap. Run database/tests/overlap_preflight.sql and resolve the listed records before retrying; no records were changed.';
  END IF;
END $$;

ALTER TABLE public.bookings ADD CONSTRAINT bookings_valid_interval
  CHECK (check_in IS NOT NULL AND check_out IS NOT NULL AND check_out > check_in);
ALTER TABLE public.bookings ADD CONSTRAINT bookings_no_active_overlap
  -- Vg2: Regeln stoppar överlapp vid skapande och ändring, även vid samtidiga anrop.
  -- Samma property_id och överlappande datum (&&) får inte förekomma tillsammans.
  -- '[)' inkluderar incheckning men utesluter utcheckning: 10–14 och 14–16 går bra.
  -- Endast pending och confirmed blockerar datum; cancelled omfattas inte.
  EXCLUDE USING gist (
    property_id WITH =,
    daterange(check_in, check_out, '[)') WITH &&
  ) WHERE (status IN ('pending', 'confirmed'));

COMMENT ON CONSTRAINT bookings_no_active_overlap ON public.bookings IS
  'VG2: pending/confirmed stays cannot overlap for one property; checkout is exclusive; cancelled stays do not block.';
NOTIFY pgrst, 'reload schema';
COMMIT;
