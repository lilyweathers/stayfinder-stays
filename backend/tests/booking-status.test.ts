import assert from "node:assert/strict";
import { test } from "node:test";
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_KEY = "test-key";
const { default: app } = await import("../src/app.js");
const user = { id: "actor", email: "guest@example.com", aud: "authenticated" };
const token = ["header", Buffer.from(JSON.stringify({ exp: 4102444800, sub: user.id })).toString("base64url"), "signature"].join(".");
const cookie = "sb-test-auth-token=base64-" + Buffer.from(JSON.stringify({ access_token: token, refresh_token: "refresh", expires_at: 4102444800, expires_in: 3600, token_type: "bearer", user })).toString("base64url");
const body = { property_id: "p1", guest_name: "Guest", guest_email: user.email, guests: 1, check_in: "2099-01-01", check_out: "2099-01-03" };
function request(status?: string, method = "PUT") {
  return app.request(method === "POST" ? "/bookings" : "/bookings/b1", { method,
    headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify({ ...body, ...(status ? { status } : {}) }) });
}

test("general update checks participants and status transitions before writing", async (t) => {
  let status = "pending", guest = user.id, owner = "host", writes = 0;
  t.mock.method(globalThis, "fetch", async (input: unknown, init: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname === "/auth/v1/user") return Response.json(user);
    assert.equal(new Headers(init.headers).get("Authorization"), `Bearer ${token}`);
    if (url.pathname === "/rest/v1/properties") return Response.json([{ owner_id: owner, max_guests: 2 }]);
    if (init.method === "GET") return Response.json([{ ...body, booking_id: "b1", guest_id: guest, status }]);
    writes++;
    assert.equal(url.searchParams.get("status"), "eq." + status);
    return Response.json([{ ...JSON.parse(String(init.body)), guest_id: guest }]);
  });
  assert.equal((await request("confirmed")).status, 403);
  guest = "other";
  assert.equal((await request("cancelled")).status, 403);
  owner = user.id;
  assert.equal((await request("confirmed")).status, 200);
  for (const participant of ["guest", "owner"]) {
    guest = participant === "guest" ? user.id : "other";
    owner = participant === "owner" ? user.id : "host";
    for (status of ["pending", "confirmed"]) assert.equal((await request("cancelled")).status, 200);
    status = "confirmed";
    assert.equal((await request("pending")).status, 409);
    const preserved = await request(); assert.equal(preserved.status, 200);
    assert.equal((await preserved.json()).status, "confirmed");
    status = "cancelled";
    for (const target of [undefined, "pending", "cancelled"]) assert.equal((await request(target)).status, 409);
  }
  assert.equal(writes, 7);
});

test("new bookings must start pending before any property or booking request", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: unknown) => {
    assert.equal(new URL(String(input)).pathname, "/auth/v1/user");
    return Response.json(user);
  });
  for (const status of ["confirmed", "cancelled"]) {
    const response = await request(status, "POST");
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { error: "New bookings must be pending" });
  }
});

test("database transition errors and concurrent status changes return clear conflicts", async (t) => {
  let result: unknown = { code: "23514", message: "Cancelled bookings cannot be edited" };
  let httpStatus = 400;
  t.mock.method(globalThis, "fetch", async (input: unknown, init: RequestInit) => {
    const path = new URL(String(input)).pathname;
    if (path === "/auth/v1/user") return Response.json(user);
    if (path === "/rest/v1/properties") return Response.json([{ max_guests: 2 }]);
    if (init.method === "GET") return Response.json([{ ...body, booking_id: "b1", guest_id: user.id, status: "pending" }]);
    return Response.json(result, { status: httpStatus });
  });
  assert.equal((await request()).status, 409);
  result = []; httpStatus = 200;
  const response = await request(); assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "Booking changed. Refresh and try again." });
});
