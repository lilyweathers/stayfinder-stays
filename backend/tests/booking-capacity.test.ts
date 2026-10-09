import assert from "node:assert/strict";
import { test } from "node:test";
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_KEY = "test-key";
const { default: app } = await import("../src/app.js");
const user = { id: "capacity-guest", email: "guest@example.com", aud: "authenticated" };
const token = ["header", Buffer.from(JSON.stringify({ exp: 4102444800, sub: user.id })).toString("base64url"), "signature"].join(".");
const cookie = "sb-test-auth-token=base64-" + Buffer.from(JSON.stringify({ access_token: token, refresh_token: "refresh", expires_at: 4102444800, expires_in: 3600, token_type: "bearer", user })).toString("base64url");
const body = { property_id: "p1", guest_name: "Guest", guest_email: user.email, check_in: "2099-01-01", check_out: "2099-01-03", guests: 2 };
function request(method: string, payload: unknown = body) {
  return app.request(method === "POST" ? "/bookings" : "/bookings/b1", { method, headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

test("create/update use current database capacity and stop excessive or forged requests before writes", async (t) => {
  let capacity = 2, reads = 0, writes = 0;
  t.mock.method(globalThis, "fetch", async (input: unknown, init: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname === "/auth/v1/user") return Response.json(user);
    assert.equal(new Headers(init.headers).get("Authorization"), `Bearer ${token}`);
    if (url.pathname === "/rest/v1/properties") {
      reads++;
      assert.equal(url.searchParams.get("select"), "max_guests");
      assert.equal(url.searchParams.get("property_id"), "eq.p1");
      assert.equal(url.searchParams.get("deleted_at"), "is.null");
      return Response.json([{ max_guests: capacity }]);
    }
    assert.equal(url.pathname, "/rest/v1/bookings"); writes++;
    const row = { ...JSON.parse(String(init.body)), booking_id: "b1" };
    return Response.json(init.method === "POST" ? row : [row]);
  });
  for (const method of ["POST", "PUT"]) {
    capacity = 2;
    assert.equal((await request(method)).status, method === "POST" ? 201 : 200);
    const before = writes;
    assert.equal((await request(method, { ...body, guests: 3 })).status, 400);
    capacity = 1;
    assert.equal((await request(method)).status, 400);
    assert.equal(writes, before);
    const beforeReads = reads;
    for (const field of ["max_guests", "capacity"]) assert.equal((await request(method, { ...body, [field]: 99 })).status, 400);
    assert.equal(reads, beforeReads);
  }
  assert.equal(writes, 2);
});

test("missing properties and failed capacity reads do not issue writes", async (t) => {
  let failed = false;
  t.mock.method(console, "error", () => {});
  t.mock.method(globalThis, "fetch", async (input: unknown) => {
    const url = new URL(String(input));
    if (url.pathname === "/auth/v1/user") return Response.json(user);
    assert.equal(url.pathname, "/rest/v1/properties");
    return failed ? Response.json({ code: "XX000", message: "Failed" }, { status: 500 }) : Response.json([]);
  });
  for (const method of ["POST", "PUT"]) {
    failed = false; assert.equal((await request(method)).status, 404);
    failed = true; assert.equal((await request(method)).status, 500);
  }
});

test("database capacity changes after precheck become clear conflicts", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: unknown) => {
    const path = new URL(String(input)).pathname;
    if (path === "/auth/v1/user") return Response.json(user);
    if (path === "/rest/v1/properties") return Response.json([{ max_guests: 2 }]);
    return Response.json({ code: "23514", message: "Guest count exceeds property capacity" }, { status: 400 });
  });
  for (const method of ["POST", "PUT"]) {
    const response = await request(method);
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { error: "The property's capacity has changed. Choose fewer guests and try again." });
  }
});

test("property PATCH/PUT translate unsafe capacity reduction into 409", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: unknown) => new URL(String(input)).pathname === "/auth/v1/user"
    ? Response.json(user) : Response.json({ code: "23514", message: "Property capacity is below an upcoming booking" }, { status: 400 }));
  for (const method of ["PATCH", "PUT"]) {
    const response = await app.request("/properties/p1", { method, headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test", description: "Fixture", location: "Test", price_per_night: 100, max_guests: 1 }) });
    assert.equal(response.status, 409);
  }
});
