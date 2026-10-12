-- Apply after 021. Historical records are retained without modification.
BEGIN;
-- Vg5: Samma svenska kalenderdatum används i databasen och API:et, även vid midnatt och sommartid.
CREATE FUNCTION public.booking_calendar_date(at_time timestamptz DEFAULT CURRENT_TIMESTAMP)
RETURNS date LANGUAGE sql STABLE STRICT SET search_path = '' AS $$
  SELECT (at_time AT TIME ZONE 'Europe/Stockholm')::date;
$$;

CREATE FUNCTION public.protect_booking_time()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE today date := public.booking_calendar_date();
BEGIN
  -- Administrators need to retain/backfill historical records. Normal client
  -- writes are checked independently of API validation and session timezone.
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'UPDATE' THEN
      -- Vg5: Utgå från det gamla datumet så att en historisk bokning inte kan flyttas fram eller avbokas.
      IF OLD.check_in < today THEN
        RAISE EXCEPTION 'Bookings with past check-in dates cannot be edited or cancelled' USING ERRCODE = '23514';
      END IF;
    END IF;
    IF NEW.check_in IS NULL OR NEW.check_out IS NULL OR NEW.check_out <= NEW.check_in THEN
      RAISE EXCEPTION 'Check-out must be after check-in' USING ERRCODE = '23514';
    END IF;
    -- Vg5: Strikt mindre än idag nekas; dagens datum är tillåtet.
    IF NEW.check_in < today THEN
      RAISE EXCEPTION 'Check-in cannot be in the past' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER protect_booking_time BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.protect_booking_time();
NOTIFY pgrst, 'reload schema';
COMMIT;
