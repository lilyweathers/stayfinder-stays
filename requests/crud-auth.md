# Live CRUD and authentication verification

Import `crud-auth.postman_collection.json` into Postman. Start the backend at
`http://localhost:3000` (or change the collection's `base_url`).

Create and select a local Postman environment containing `email` and `password`
for your confirmed test account. Keep credentials local and out of exported files.
Keep cookies enabled; the collection uses **No Auth** because login sets the
session cookies automatically.

Run the requests in numbered order, once. Stop if a request or assertion fails;
retain the captured IDs for cleanup. Do not substitute existing records' IDs.

The 35 requests:

- Log in and verify the session.
- Create, read, update, and read back a temporary property and booking.
- Log out and verify public property reads still work.
- Verify every protected property write and booking route returns 401 anonymously.
- Log back in, verify the denied updates made no changes, delete the temporary
  booking and property, and verify each now returns 404.
- Log out again.

Save the Runner results with request names, response statuses, and passed/failed
assertions. Avoid exporting passwords, cookies, or authorization headers.
Report any failed request's name, status, and sanitized response body.

The user confirmed live CRUD and anonymous denial on 2026-10-06 using their
Postman requests. The corresponding criteria milestones are checked; a run of
this specific collection has not been independently observed.
These checks verify the lecture's shared authenticated access, not per-user
ownership policies or direct database access.
