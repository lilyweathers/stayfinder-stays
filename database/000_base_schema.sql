-- Fresh Supabase project only; skip on the existing course database.
-- Intentionally fails if tables exist. Apply 001–025 afterward, excluding the
-- historical one-time data assignments 003, 005 and 009.
BEGIN;
CREATE TABLE public.properties (
  property_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  location text NOT NULL,
  price_per_night numeric(14,2) NOT NULL CHECK (price_per_night >= 0),
  max_guests integer NOT NULL CHECK (max_guests > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.bookings (
  booking_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(property_id),
  guest_name text NOT NULL,
  guest_email text NOT NULL,
  check_in date NOT NULL,
  check_out date NOT NULL,
  guests integer NOT NULL CHECK (guests > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled'))
);
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties, public.bookings TO anon, authenticated;
COMMIT;
