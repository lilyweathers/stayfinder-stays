import assert from "node:assert/strict";
import { test } from "node:test";
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_KEY = "test-key";

const { default: app } = await import("../src/app.js");
const user = { id: "test-user", email: "guest@example.com", aud: "authenticated" };
const accessToken = ["header", Buffer.from(JSON.stringify({ exp: 4102444800, sub: user.id })).toString("base64url"), "signature"].join(".");
const session = { access_token: accessToken, refresh_token: "test-refresh", expires_at: 4102444800, expires_in: 3600, token_type: "bearer", user };
const cookie = "sb-test-auth-token=base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
function request(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cookie", cookie);
  return app.request(path, { ...init, headers });
}
function authResponse(input: unknown): Response | undefined {
  if (new URL(String(input)).pathname === "/auth/v1/user") return Response.json(user);
}


// Match PostgREST's array responses and its singular-response Accept header.
function databaseRows(rows: unknown[], init: RequestInit): Response {
  const accept = new Headers(init.headers).get("accept");
  if (accept === "application/vnd.pgrst.object+json") {
    if (rows.length !== 1) {
      return Response.json({
        code: "PGRST116",
        message: "Cannot coerce the result to a single JSON object",
        details: `The result contains ${rows.length} rows`,
      }, { status: 406 });
    }
    return Response.json(rows[0]);
  }
  return Response.json(rows);
}

test("root identifies the API", async () => {
  const response = await app.request("/");
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "StayFinder API");
});

test("properties can be listed and fetched by id", async (t) => {
  // Test-only response data; production properties come exclusively from Supabase.
  const fixtures: Property[] = [{
    property_id: "property_1001",
    title: "Test property",
    description: "Property used only by the API test",
    location: "Test location",
    price_per_night: 100,
    max_guests: 2,
  }];
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init: RequestInit) => {
    const auth = authResponse(input);
    if (auth) return auth;
    const url = new URL(String(input));
    assert.equal(url.pathname, "/rest/v1/properties");
    const id = url.searchParams.get("property_id");
    return databaseRows(id ? fixtures.filter((item) => `eq.${item.property_id}` === id) : fixtures, init);
  });
  const listResponse = await request("/properties");
  assert.equal(listResponse.status, 200);
  const properties = (await listResponse.json()) as Property[];
  assert.equal(properties.length, fixtures.length);

  const itemResponse = await request("/properties/property_1001");
  assert.equal(itemResponse.status, 200);
  assert.deepEqual(await itemResponse.json(), fixtures.find((item) => item.property_id === "property_1001"));
});

test("booking CRUD uses Supabase", async (t) => {
  const body = {
    property_id: "property_1001",
    guest_name: "Test Guest",
    guest_email: "guest@example.com",
    check_in: "2026-10-10",
    check_out: "2026-10-12",
    guests: 2,
  };
  let stored: Booking | undefined;
  const methods: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init: RequestInit) => {
    const auth = authResponse(input);
    if (auth) return auth;
    const url = new URL(String(input));
    assert.equal(url.pathname, "/rest/v1/bookings");
    methods.push(init.method!);
    if (init.method === "POST") {
      const payload = JSON.parse(String(init.body));
      assert.deepEqual(payload, { ...body, status: "pending" });
      stored = { ...payload, booking_id: "generated-booking-id", status: "pending" };
      return databaseRows([stored], init);
    }
    const filter = url.searchParams.get("booking_id");
    if (filter) assert.equal(filter, "eq.generated-booking-id");
    if (init.method === "PATCH") {
      assert.ok(filter);
      const payload = JSON.parse(String(init.body));
      assert.equal(payload.booking_id, "generated-booking-id");
      stored = payload;
    }
    const result = stored ? [stored] : [];
    if (init.method === "DELETE") {
      assert.ok(filter);
      stored = undefined;
    }
    return databaseRows(result, init);
  });
  const createResponse = await request("/bookings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.equal(createResponse.status, 201);
  const created = (await createResponse.json()) as Booking;
  assert.equal(created.booking_id, "generated-booking-id");
  assert.equal(created.status, "pending");

  const listResponse = await request("/bookings");
  assert.equal(listResponse.status, 200);
  assert.deepEqual(await listResponse.json(), [created]);
  const itemResponse = await request(`/bookings/${created.booking_id}`);
  assert.equal(itemResponse.status, 200);
  assert.deepEqual(await itemResponse.json(), created);

  const updateResponse = await request(`/bookings/${created.booking_id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...body,
      booking_id: "attempted-id-change",
      status: "confirmed",
    }),
  });
  assert.equal(updateResponse.status, 200);
  const updated = (await updateResponse.json()) as Booking;
  assert.equal(updated.booking_id, created.booking_id);
  assert.equal(updated.status, "confirmed");

  const deleteResponse = await request(`/bookings/${created.booking_id}`, {
    method: "DELETE",
  });
  assert.equal(deleteResponse.status, 200);

  const missingResponse = await request(`/bookings/${created.booking_id}`);
  assert.equal(missingResponse.status, 404);
  assert.deepEqual(methods, ["POST", "GET", "GET", "PATCH", "DELETE", "GET"]);
});

test("invalid booking input returns validation details", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: unknown) => authResponse(input)!);
  const response = await request("/bookings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ guest_email: "not-an-email" }),
  });
  assert.equal(response.status, 400);
  const result = (await response.json()) as { errors: unknown[] };
  assert.ok(result.errors.length > 0);
});

test("property writes use Supabase and preserve the route ID", async (t) => {
  const body = {
    title: "Test apartment", description: "A bright apartment", location: "Stockholm",
    price_per_night: 850, max_guests: 2,
  };
  const property = { ...body, property_id: "generated-id" };
  const expectedMethods = ["POST", "PATCH", "DELETE"];
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init: RequestInit) => {
    const auth = authResponse(input);
    if (auth) return auth;
    const url = new URL(String(input));
    const method = expectedMethods.shift();
    assert.equal(init.method, method);
    assert.equal(url.pathname, "/rest/v1/properties");
    assert.equal(url.searchParams.get("select"), "*");
    if (method === "POST") {
      assert.deepEqual(JSON.parse(String(init.body)), body);
    } else {
      assert.equal(url.searchParams.get("property_id"), "eq.generated-id");
      if (method === "PATCH") {
        assert.deepEqual(JSON.parse(String(init.body)), { title: "Updated apartment", property_id: "generated-id" });
      }
    }
    return databaseRows([property], init);
  });
  const created = await request("/properties", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...body, property_id: "ignored-id" }),
  });
  assert.equal(created.status, 201);
  assert.deepEqual(await created.json(), property);
  const updated = await request("/properties/generated-id", {
    method: "PATCH", headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Updated apartment", property_id: "attempted-id-change" }),
  });
  assert.equal(updated.status, 200);
  assert.deepEqual(await updated.json(), property);
  const deleted = await request("/properties/generated-id", { method: "DELETE" });
  assert.equal(deleted.status, 200);
  assert.deepEqual(await deleted.json(), property);
  assert.deepEqual(expectedMethods, []);
});

test("missing properties return 404 and database errors return 500", async (t) => {
  let fail = false;
  t.mock.method(globalThis, "fetch", async (_input: unknown, init: RequestInit) => authResponse(_input) ?? (fail
    ? Response.json({ message: "Database unavailable", code: "XX000" }, { status: 400 })
    : databaseRows([], init)));
  t.mock.method(console, "error", () => {});
  for (const method of ["GET", "PATCH", "DELETE"]) {
    const options = method === "PATCH"
      ? { method, headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Updated title" }) }
      : { method };
    const missing = await request("/properties/missing-id", options);
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { error: "Property not found" });
    fail = true;
    const failed = await request("/properties/missing-id", options);
    assert.equal(failed.status, 500);
    fail = false;
  }
});

test("booking routes handle missing rows, database failures, and duplicate IDs", async (t) => {
  const body = {
    property_id: "property_1001", guest_name: "Test Guest",
    guest_email: "guest@example.com", check_in: "2026-10-10",
    check_out: "2026-10-12", guests: 2,
  };
  let errorCode: string | undefined;
  t.mock.method(globalThis, "fetch", async (_input: unknown, init: RequestInit) => authResponse(_input) ?? (errorCode
    ? Response.json({ code: errorCode, message: "Database error" }, { status: 400 })
    : databaseRows([], init)));
  t.mock.method(console, "error", () => {});
  for (const method of ["GET", "PUT", "DELETE"]) {
    const options = method === "PUT"
      ? { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
      : { method };
    const missing = await request("/bookings/missing-id", options);
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { error: "Booking not found" });
    errorCode = "XX000";
    const failed = await request("/bookings/missing-id", options);
    assert.equal(failed.status, 500);
    errorCode = undefined;
  }
  errorCode = "XX000";
  assert.equal((await request("/bookings")).status, 500);
  const options = {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...body, booking_id: "duplicate-id" }),
  };
  assert.equal((await request("/bookings", options)).status, 500);
  errorCode = "23505";
  const duplicate = await request("/bookings", options);
  assert.equal(duplicate.status, 409);
  assert.deepEqual(await duplicate.json(), { error: "Booking ID already exists" });
});

test("anonymous requests cannot access protected routes", async () => {
  for (const [method, path] of [
    ["GET", "/bookings"], ["GET", "/bookings/id"], ["POST", "/bookings"],
    ["PUT", "/bookings/id"], ["DELETE", "/bookings/id"],
    ["POST", "/properties"], ["PATCH", "/properties/id"], ["PUT", "/properties/id"], ["DELETE", "/properties/id"],
    ["GET", "/auth/me"], ["POST", "/auth/logout"],
  ]) {
    const response = await app.request(path!, { method });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
  }
});

test("login sets cookies, me verifies identity, logout clears cookies", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: unknown) => {
    const path = new URL(String(input)).pathname;
    if (path === "/auth/v1/token") return Response.json(session);
    if (path === "/auth/v1/user") return Response.json(user);
    if (path === "/auth/v1/logout") return new Response(null, { status: 204 });
    throw new Error("Unexpected request " + path);
  });
  const login = await app.request("/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, password: "password123" }),
  });
  assert.equal(login.status, 200);
  assert.deepEqual(await login.json(), { user });
  const setCookie = login.headers.get("set-cookie")!;
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);
  assert.doesNotMatch(setCookie, /; Secure/i);
  const headers = { Cookie: setCookie.split(";")[0]! };
  const me = await app.request("/auth/me", { headers });
  assert.equal(me.status, 200);
  assert.deepEqual(await me.json(), { user });
  const logout = await app.request("/auth/logout", { method: "POST", headers });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie")!, /Max-Age=0/i);
});

test("credentialed CORS preflight and origin rejection", async () => {
  const response = await app.request("/bookings", { method: "OPTIONS", headers: {
    Origin: "http://localhost:3001", "Access-Control-Request-Method": "POST",
  } });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:3001");
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
  assert.equal((await app.request("/auth/login", { method: "POST", headers: { Origin: "https://other.example" } })).status, 403);
});

test("registration handles email confirmation and invalid credentials", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: unknown) => {
    if (new URL(String(input)).pathname === "/auth/v1/signup") return Response.json({ user });
    return Response.json({ error_code: "invalid_credentials", msg: "Invalid login credentials" }, { status: 400 });
  });
  const options = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: user.email, password: "password123" }) };
  const registered = await app.request("/auth/register", options);
  assert.equal(registered.status, 201);
  assert.deepEqual(await registered.json(), { user, confirmationRequired: true });
  assert.doesNotMatch(registered.headers.get("set-cookie") ?? "", /sb-test-auth-token=base64-/);
  const failed = await app.request("/auth/login", options);
  assert.equal(failed.status, 400);
  assert.deepEqual(await failed.json(), { error: "Invalid credentials" });
  const invalid = await app.request("/auth/register", { ...options, body: JSON.stringify({ email: "invalid", password: "123" }) });
  assert.equal(invalid.status, 400);
});

test("expired access tokens refresh and write updated cookies", async (t) => {
  const expired = { ...session, expires_at: 1, access_token: ["header", Buffer.from(JSON.stringify({ exp: 1, sub: user.id })).toString("base64url"), "signature"].join(".") };
  const expiredCookie = "sb-test-auth-token=base64-" + Buffer.from(JSON.stringify(expired)).toString("base64url");
  let refreshes = 0;
  t.mock.method(globalThis, "fetch", async (input: unknown, init: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname === "/auth/v1/token") {
      assert.equal(url.searchParams.get("grant_type"), "refresh_token");
      refreshes++;
      return Response.json({ ...session, refresh_token: "rotated-refresh" });
    }
    if (url.pathname === "/auth/v1/user") {
      assert.equal(new Headers(init.headers).get("authorization"), "Bearer " + accessToken);
      return Response.json(user);
    }
    throw new Error("Unexpected fetch");
  });
  const response = await app.request("/auth/me", { headers: { Cookie: expiredCookie } });
  assert.equal(response.status, 200);
  assert.equal(refreshes, 1);
  assert.match(response.headers.get("set-cookie")!, /HttpOnly/i);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("invalid session is rejected and database receives the user's token", async (t) => {
  let valid = false;
  t.mock.method(globalThis, "fetch", async (input: unknown, init: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname === "/auth/v1/user") return valid ? Response.json(user) : Response.json({ msg: "Invalid JWT", error_code: "bad_jwt" }, { status: 401 });
    assert.equal(url.pathname, "/rest/v1/bookings");
    assert.equal(new Headers(init.headers).get("authorization"), "Bearer " + accessToken);
    return Response.json([]);
  });
  assert.equal((await request("/bookings")).status, 401);
  valid = true;
  assert.equal((await request("/bookings")).status, 200);
});
