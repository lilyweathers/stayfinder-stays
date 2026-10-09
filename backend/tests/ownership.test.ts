import assert from "node:assert/strict";
import { test } from "node:test";

process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_KEY = "test-key";
const { default: app } = await import("../src/app.js");
const user = { id: "guest-a", email: "guest-a@example.com", aud: "authenticated" };
const token = ["header", Buffer.from(JSON.stringify({ exp: 4102444800, sub: user.id })).toString("base64url"), "signature"].join(".");
const session = { access_token: token, refresh_token: "refresh", expires_at: 4102444800, expires_in: 3600, token_type: "bearer", user };
const cookie = "sb-test-auth-token=base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
const property = { title: "Test stay", description: "Test description", location: "Test location", price_per_night: 100, max_guests: 2 };
const booking = { property_id: "p1", guest_name: "Guest", guest_email: user.email, check_in: "2026-10-10", check_out: "2026-10-12", guests: 1 };
function request(path: string, method: string, body?: unknown) {
  return app.request(path, { method, headers: { Cookie: cookie, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
}

test("creation derives ownership from Auth verification rather than cached session identity", async (t) => {
  const verifiedUser = { ...user, id: "verified-user" };
  t.mock.method(globalThis, "fetch", async (input: unknown, init: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname === "/auth/v1/user") return Response.json(verifiedUser);
    if (url.pathname === "/rest/v1/properties" && init.method === "GET") return Response.json([{ max_guests: 2, price_per_night: 100 }]);
    assert.equal(init.method, "POST");
    assert.equal(new Headers(init.headers).get("Authorization"), "Bearer " + token);
    const body = JSON.parse(String(init.body));
    if (url.pathname === "/rest/v1/properties") {
      assert.equal(body.owner_id, verifiedUser.id);
      return Response.json({ ...body, property_id: "created-property" });
    }
    assert.equal(url.pathname, "/rest/v1/bookings");
    assert.equal(body.guest_id, verifiedUser.id);
    return Response.json({ ...body, booking_id: "created-booking" });
  });
  const propertyResponse = await request("/properties", "POST", property);
  assert.equal(propertyResponse.status, 201);
  assert.equal((await propertyResponse.json()).owner_id, verifiedUser.id);
  const bookingResponse = await request("/bookings", "POST", { ...booking, check_in: "2099-01-01", check_out: "2099-01-03" });
  assert.equal(bookingResponse.status, 201);
  assert.equal((await bookingResponse.json()).guest_id, verifiedUser.id);
});

test("RLS-hidden bookings stay inaccessible across all single-booking routes using the user's token", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: unknown, init: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname === "/auth/v1/user") return Response.json(user);
    if (url.pathname === "/rest/v1/properties") return Response.json([{ max_guests: 2, price_per_night: 100 }]);
    assert.equal(url.pathname, "/rest/v1/bookings");
    assert.equal(url.searchParams.get("booking_id"), "eq.hidden");
    assert.equal(new Headers(init.headers).get("Authorization"), "Bearer " + token);
    return Response.json([]);
  });
  for (const [path, method, body] of [
    ["/bookings/hidden", "GET", undefined],
    ["/bookings/hidden", "PUT", { ...booking, check_in: "2099-01-01", check_out: "2099-01-03" }],
    ["/bookings/hidden", "DELETE", undefined],
    ["/bookings/hidden/cancel", "POST", undefined],
    ["/bookings/hidden/confirm", "POST", undefined],
  ] as const) assert.equal((await request(path, method, body)).status, 404);
});

test("API rejects forged ownership fields before issuing database writes", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: unknown) => {
    assert.equal(new URL(String(input)).pathname, "/auth/v1/user");
    return Response.json(user);
  });
  for (const [path, method, body] of [
    ["/properties", "POST", { ...property, owner_id: "victim" }],
    ["/properties/p1", "PUT", { ...property, owner_id: "victim" }],
    ["/properties/p1", "PATCH", { owner_id: "victim" }],
    ["/bookings", "POST", { ...booking, guest_id: "victim" }],
    ["/bookings/b1", "PUT", { ...booking, guest_id: "victim" }],
  ] as const) assert.equal((await request(path, method, body)).status, 400);
});

test("API property mutations constrain owner and denied rows remain hidden", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: unknown, init: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname === "/auth/v1/user") return Response.json(user);
    if (url.pathname === "/rest/v1/rpc/delete_property") {
      assert.deepEqual(JSON.parse(String(init.body)), { p_property_id: "not-owned" });
      assert.equal(new Headers(init.headers).get("Authorization"), "Bearer " + token);
      return Response.json(null);
    }
    assert.equal(url.pathname, "/rest/v1/properties");
    assert.equal(url.searchParams.get("owner_id"), "eq.guest-a");
    assert.equal(new Headers(init.headers).get("Authorization"), "Bearer " + token);
    return Response.json([]);
  });
  for (const [method, body] of [["PATCH", { title: "Updated" }], ["PUT", property], ["DELETE", undefined]] as const) {
    assert.equal((await request("/properties/not-owned", method, body)).status, 404);
  }
});

test("API translates database ownership rejection to 403", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: unknown, init: RequestInit) => {
    if (new URL(String(input)).pathname === "/auth/v1/user") return Response.json(user);
    if (new URL(String(input)).pathname === "/rest/v1/properties" && init.method === "GET") return Response.json([{ max_guests: 2, price_per_night: 100 }]);
    return Response.json({ code: "42501", message: "Ownership denied" }, { status: 403 });
  });
  assert.equal((await request("/properties", "POST", property)).status, 403);
  assert.equal((await request("/bookings", "POST", booking)).status, 403);
  assert.equal((await request("/bookings/b1", "PUT", booking)).status, 403);
});

test("cancellation permits guest/host and rejects past, cancelled, unrelated and changed bookings", async (t) => {
  let row: Record<string, unknown> | null = { ...booking, booking_id: "b1", guest_id: user.id, nightly_price: 100, total_price: 200, status: "pending", check_in: "2099-01-01" };
  let ownerId = "host";
  let writeConflict = false;
  let writes = 0;
  t.mock.method(globalThis, "fetch", async (input: unknown, init: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname === "/auth/v1/user") return Response.json(user);
    if (url.pathname === "/rest/v1/properties") return Response.json([{ owner_id: ownerId }]);
    assert.equal(url.pathname, "/rest/v1/bookings");
    if (init.method === "PATCH") {
      writes++;
      assert.deepEqual(JSON.parse(String(init.body)), { status: "cancelled" });
      assert.equal(url.searchParams.get("status"), "in.(pending,confirmed)");
      assert.match(url.searchParams.get("check_in")!, /^gte\.\d{4}-\d{2}-\d{2}$/);
      assert.equal(new Headers(init.headers).get("Authorization"), "Bearer " + token);
      return Response.json(writeConflict ? [] : [{ ...row, status: "cancelled" }]);
    }
    return Response.json(row ? [row] : []);
  });
  assert.equal((await request("/bookings/b1/cancel", "POST")).status, 200);
  row = { ...row, guest_id: "other", status: "confirmed" };
  ownerId = user.id;
  assert.equal((await request("/bookings/b1/cancel", "POST")).status, 200);
  ownerId = "unrelated";
  assert.equal((await request("/bookings/b1/cancel", "POST")).status, 403);
  row = { ...row, guest_id: user.id, nightly_price: 100, total_price: 200, status: "cancelled" };
  assert.equal((await request("/bookings/b1/cancel", "POST")).status, 409);
  row = { ...row, status: "pending", check_in: "2000-01-01" };
  assert.equal((await request("/bookings/b1/cancel", "POST")).status, 409);
  assert.equal(writes, 2);
  row = { ...row, check_in: "2099-01-01" };
  writeConflict = true;
  assert.equal((await request("/bookings/b1/cancel", "POST")).status, 409);
  row = null;
  assert.equal((await request("/bookings/b1/cancel", "POST")).status, 404);
  assert.equal((await app.request("/bookings/b1/cancel", { method: "POST" })).status, 401);
});

test("confirmation requires host and pending future booking, including conditional-write conflicts", async (t) => {
  let status = "pending";
  let ownerId = "someone-else";
  let date = "2099-01-01";
  let missing = false;
  let conflict = false;
  let writes = 0;
  t.mock.method(globalThis, "fetch", async (input: unknown, init: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname === "/auth/v1/user") return Response.json(user);
    if (url.pathname === "/rest/v1/properties") return Response.json([{ owner_id: ownerId }]);
    if (init.method === "PATCH") {
      writes++;
      assert.deepEqual(JSON.parse(String(init.body)), { status: "confirmed" });
      assert.equal(url.searchParams.get("status"), "eq.pending");
      assert.match(url.searchParams.get("check_in")!, /^gte\./);
      return Response.json(conflict ? [] : [{ ...booking, booking_id: "b1", status: "confirmed" }]);
    }
    return Response.json(missing ? [] : [{ ...booking, booking_id: "b1", guest_id: user.id, status, check_in: date }]);
  });
  assert.equal((await request("/bookings/b1/confirm", "POST")).status, 403);
  ownerId = user.id;
  assert.equal((await request("/bookings/b1/confirm", "POST")).status, 200);
  for (const nextStatus of ["confirmed", "cancelled"]) {
    status = nextStatus;
    assert.equal((await request("/bookings/b1/confirm", "POST")).status, 409);
  }
  status = "pending"; date = "2000-01-01";
  assert.equal((await request("/bookings/b1/confirm", "POST")).status, 409);
  assert.equal(writes, 1);
  date = "2099-01-01"; conflict = true;
  assert.equal((await request("/bookings/b1/confirm", "POST")).status, 409);
  missing = true;
  assert.equal((await request("/bookings/b1/confirm", "POST")).status, 404);
  assert.equal((await app.request("/bookings/b1/confirm", { method: "POST" })).status, 401);
});

test("guest listing uses authenticated guest ID and host listing checks property ownership", async (t) => {
  let ownerId = "unrelated";
  let bookingReads = 0;
  t.mock.method(globalThis, "fetch", async (input: unknown, init: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname === "/auth/v1/user") return Response.json(user);
    if (url.pathname === "/rest/v1/properties") return Response.json([{ owner_id: ownerId }]);
    assert.equal(url.pathname, "/rest/v1/bookings");
    assert.equal(new Headers(init.headers).get("Authorization"), "Bearer " + token);
    bookingReads++;
    if (url.searchParams.has("property_id")) {
      assert.equal(url.searchParams.get("property_id"), "eq.p1");
      assert.equal(ownerId, user.id);
    } else assert.equal(url.searchParams.get("guest_id"), "eq." + user.id);
    return Response.json([]);
  });
  assert.equal((await request("/bookings?guest_id=victim", "GET")).status, 200);
  assert.equal((await request("/bookings?property_id=p1", "GET")).status, 403);
  assert.equal(bookingReads, 1);
  ownerId = user.id;
  assert.equal((await request("/bookings?property_id=p1", "GET")).status, 200);
  assert.equal(bookingReads, 2);
});

test("booking deletion requires a participant and an active current/future booking", async (t) => {
  let row: Record<string, unknown> | null = { ...booking, booking_id: "b1", guest_id: user.id, nightly_price: 100, total_price: 200, status: "pending", check_in: "2099-01-01" };
  let ownerId = "host";
  let deleteError: string | undefined;
  let conflict = false;
  let deletes = 0;
  t.mock.method(globalThis, "fetch", async (input: unknown, init: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname === "/auth/v1/user") return Response.json(user);
    if (url.pathname === "/rest/v1/properties") return Response.json([{ owner_id: ownerId }]);
    assert.equal(url.pathname, "/rest/v1/bookings");
    if (init.method === "DELETE") {
      deletes++;
      assert.equal(url.searchParams.get("booking_id"), "eq.b1");
      assert.equal(url.searchParams.get("status"), row?.status === "cancelled" ? "in.(cancelled)" : "in.(pending,confirmed)");
      assert.match(url.searchParams.get("check_in")!, /^gte\.\d{4}-\d{2}-\d{2}$/);
      assert.equal(new Headers(init.headers).get("Authorization"), "Bearer " + token);
      if (deleteError) return Response.json({ code: deleteError, message: "Denied" }, { status: 400 });
      return Response.json(conflict ? [] : [row]);
    }
    return Response.json(row ? [row] : []);
  });
  assert.equal((await request("/bookings/b1", "DELETE")).status, 200);
  row = { ...row, guest_id: "other", status: "confirmed" };
  ownerId = user.id;
  assert.equal((await request("/bookings/b1", "DELETE")).status, 200);
  ownerId = "unrelated";
  assert.equal((await request("/bookings/b1", "DELETE")).status, 403);
  row = { ...row, guest_id: user.id, nightly_price: 100, total_price: 200, status: "cancelled" };
  assert.equal((await request("/bookings/b1", "DELETE")).status, 403);
  ownerId = user.id;
  assert.equal((await request("/bookings/b1", "DELETE")).status, 200);
  row = { ...row, check_in: "2000-01-01" };
  assert.equal((await request("/bookings/b1", "DELETE")).status, 409);
  ownerId = "unrelated";
  row = { ...row, status: "pending", check_in: "2000-01-01" };
  assert.equal((await request("/bookings/b1", "DELETE")).status, 409);
  row = { ...row, check_in: "2099-02-30" };
  assert.equal((await request("/bookings/b1", "DELETE")).status, 409);
  assert.equal(deletes, 3);
  row = { ...row, check_in: "2099-01-01" };
  conflict = true;
  assert.equal((await request("/bookings/b1", "DELETE")).status, 409);
  conflict = false;
  deleteError = "23514";
  assert.equal((await request("/bookings/b1", "DELETE")).status, 409);
  deleteError = "42501";
  assert.equal((await request("/bookings/b1", "DELETE")).status, 403);
  row = null;
  assert.equal((await request("/bookings/b1", "DELETE")).status, 404);
  assert.equal((await app.request("/bookings/b1", { method: "DELETE" })).status, 401);
});
