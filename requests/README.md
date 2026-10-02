# API request preparation

`stayfinder.http` contains HTTP request examples with {{variables}} and ###
separators, suitable for an HTTP request editor such as VS Code REST Client.
It is a manual template, not an automated test suite. Expected results are
planned assertions and have not been recorded as actual outcomes.

## Use now

Start the API from backend/ with `npm run dev`. Send CURRENT requests individually.
For property details, replace propertyId with an existing UUID from the list.
The all-zero missing UUID must actually be absent. Invalid booking input currently
reaches validation without login; once auth is added, authenticate for that case.

Bash alternatives for basic reads:

```bash
curl -i http://localhost:3000/
curl -i http://localhost:3000/properties
curl -i http://localhost:3000/route-that-does-not-exist
```

## Use later

PLANNED sections include auth routes and query parameters that do not exist yet.
Review and update them against the final API contract before sending them.
Current write routes lack the planned ownership and booking checks, so running
these examples now could create invalid records rather than reject them.

Use disposable development fixtures: one property owned by the owner account
(price 1000, capacity 2), guest A and guest B accounts, nonoverlapping bookings,
and a separate past-check-in booking for time-rule tests. Refresh future dates
when needed. Run each case with stated preconditions and verify persisted data
as well as HTTP status. Isolate cases or reset fixtures between them; do not
assume all requests form a single independent repeatable sequence.

Use a request tool with separate cookie stores per actor. Anonymous cases need
an empty cookie store: removing an explicit Cookie header does not disable a
client's automatically stored cookies. Keep actual credentials in ignored local
files or your tool's private settings. Never save tokens in the committed template.

For future Bash login tests, curl can save Set-Cookie values in a local jar
(`-c requests/local/guest-a.cookies`) and send them with
`-b requests/local/guest-a.cookies`. Include
`-H 'Origin: http://localhost:3001'` on mutations under the planned CSRF policy.
Create requests/local first and keep it ignored by Git. Authenticate each actor
separately; inspect logout and expiry behavior.

## Complete before submission

Convert every remaining comment-only case into concrete requests or a linked
repeatable concurrency test. Pin final parameter names and exact expected statuses.
Record actual results in docs/criteria.md. Confirm G1-G16 and every selected VG
criterion, including successful and rejected calls. UI behavior also needs manual
verification; API requests do not prove form errors or session persistence in UI.

Direct database verification must use the Supabase REST endpoint or relevant
RPC with a publishable/anon key and the actual user's access JWT. Test anonymous,
owner, guest A, and guest B independently. Do not use a service-role key as proof
of user permissions. Verify denied writes leave records unchanged; policy-filtered
reads can hide rows rather than return 403. Add actual database calls once schema,
functions, policies, and public contracts are known.

Mocked backend tests do not replace these database checks. Do not describe this
preparation template as a completed test report.
