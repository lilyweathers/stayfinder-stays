# VG7 available-date search verification

Run in Supabase SQL Editor as administrator:

1. `database/025_available_property_search.sql` after 024.
2. `database/tests/available_search.sql` — expect PASS; all fixtures roll back.

Then from `backend`:

```powershell
node --import tsx scripts/verify-search-live.mjs
```

The runner uses the ignored VG1 accounts to create disposable properties and bookings, then searches anonymously through the API and directly through Supabase. It checks pending/confirmed exclusion, cancelled inclusion, both adjacent boundaries, invalid/incomplete dates, combined location/maximum-price/capacity filters, inclusive limits and both sort orders. All fixtures are removed afterward.

Dates are optional for normal browsing. To search availability, both dates are required, check-in must be today or later in Europe/Stockholm, and checkout must be later. Availability uses `[check_in, check_out)` exactly as VG2: a booking conflicts when its check-in is before the requested checkout and its checkout is after the requested check-in. Only pending and confirmed bookings block dates. Deleted properties are excluded.

One security-definer database query checks bookings across guest RLS and returns property rows only, never booking references or guest details. Filters and sorting are applied inside the same query. Location is a literal, case-insensitive substring; prices/capacity limits are inclusive. Ties sort by property ID. Booking creation still uses VG2's atomic protection if another reservation is made after a search.

Browser review: open `/properties`, choose dates and filters, apply them, and check results and both price sorts. Clear filters should clear the dates too. Incomplete dates should produce a clear error.
