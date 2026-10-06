# Direct Supabase RLS verification

Import `supabase-rls.postman_collection.json` into Postman. This collection calls
Supabase directly; the Hono server does not need to run.

Create and select a local environment with:

- `supabase_publishable_key`: your project's publishable key from Supabase's
  API Keys settings. Never use a secret or service_role key for this test.
- `email` and `password`: your confirmed test account's credentials.

The project URL is set in the collection. Authorization is No Auth; authenticated
requests explicitly send the user's bearer token, captured by request 01.
Anonymous requests omit the Authorization header entirely. Disable Postman's
cookie jar for these requests so anonymous tests cannot reuse a browser session.

Run requests 01-22 in order, once, against your development project. Stop if any
assertion fails. Status mismatches stop the Runner automatically, but inspect
all assertions too. Retain captured IDs if cleanup is needed, and delete only
the temporary records created by this run.

| Check | Expected result |
| --- | --- |
| Authenticated property and booking create | 201 with one created row |
| Anonymous property read | 200 with the temporary property |
| Anonymous booking read | 200 with [] |
| Anonymous property and booking insert | 401 with database error code 42501 |
| Anonymous update and delete | 200 with []; no rows changed |
| Authenticated reads after anonymous writes | Original records still present and unchanged |
| Authenticated update | 200 with one row; subsequent read confirms saved values |
| Authenticated delete | 200 with one deleted row; subsequent read returns [] |

Unlike Hono's requireAuth middleware, RLS may hide rows rather than return 401
for reads, updates, and deletes. The collection uses return=representation to
check affected rows, and re-reads records with authenticated access.

The final request invalidates the direct test session and clears its access token.
Report request names, statuses, and assertion results without credentials or
tokens. Do not export your environment or login response.

On 2026-10-06 the user reported all 43 assertions passed in the live Postman run.
The criteria milestone is checked with this user-reported evidence. The collection
tests the basic shared authenticated policies, not VG ownership restrictions.

References: [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys),
[Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).
