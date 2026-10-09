# VG6 saved booking price verification

Run in Supabase SQL Editor as administrator, in order:

1. `database/tests/price_preflight.sql`. Review the first result set: it previews each existing booking's backfill rate and total using the property's currently stored price. The second result set must be empty.
2. `database/023_booking_price.sql` after migration 022. Applying it initializes existing booking prices from the reviewed current rates. It does not claim to recover original historical rates, which were never stored. Missing permanently deleted properties or invalid prices/dates cause the migration to stop; review those records rather than guessing a rate.
3. `database/024_property_price_precision.sql`. This also repairs installations that applied the original 023 while property rates were still integer.
4. `database/tests/price.sql`. Expect PASS; test fixtures roll back.

Then, from `backend`, run:

```powershell
node --import tsx scripts/verify-price-live.mjs
```

The runner uses the ignored VG1 host/guest accounts and removes its disposable records. It verifies known decimal totals, forged API and direct-Supabase prices, frozen rates after property updates, date edits recalculating at the saved rate, new bookings using the changed property price, and cancellation retaining the saved total.

Bookings save `nightly_price` and `total_price`. On creation, the API calculates nights using UTC calendar-date subtraction, rounds the current database rate to two decimals using decimal arithmetic, and sends the calculated values. A database trigger independently reads and locks the property row and overwrites submitted values. On update, the trigger retains the old booked rate and recalculates the total from the new dates. Property price updates never change existing booking totals. Monetary values use two decimal places; totals are bounded to the supported exact-cent range.

API client `total_price`, `nightly_price`, and `price_per_night` fields are accepted only to discard them. They never become trusted write values. The creation summary and guest booking list show the persisted total; the prebooking form remains a current-rate estimate.
