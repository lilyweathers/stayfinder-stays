import assert from "node:assert/strict";
import { test } from "node:test";
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_KEY = "test-key";
const { default: app } = await import("../src/app.js");
const { bookingSchema } = await import("../src/validators/bookingValidator.js");
const { bookingToday } = await import("../src/lib/booking-date.js");
const user = { id: "time-guest", email: "guest@example.com", aud: "authenticated" };
const token = ["header", Buffer.from(JSON.stringify({ exp: 4102444800, sub: user.id })).toString("base64url"), "signature"].join(".");
const cookie = "sb-test-auth-token=base64-" + Buffer.from(JSON.stringify({ access_token: token, refresh_token: "refresh", expires_at: 4102444800, expires_in: 3600, token_type: "bearer", user })).toString("base64url");
const body = { property_id: "p1", guest_name: "Guest", guest_email: user.email, guests: 1, check_in: "2099-01-01", check_out: "2099-01-03" };
const boundaries = [
  ["2027-01-01T22:59:59Z", "2027-01-01"],
  ["2027-01-01T23:00:00Z", "2027-01-02"],
  ["2027-07-01T21:59:59Z", "2027-07-01"],
  ["2027-07-01T22:00:00Z", "2027-07-02"],
  ["2027-03-28T00:59:59Z", "2027-03-28"],
  ["2027-03-28T01:00:00Z", "2027-03-28"],
  ["2027-10-31T00:59:59Z", "2027-10-31"],
  ["2027-10-31T01:00:00Z", "2027-10-31"],
] as const;

test("Stockholm date boundaries govern validation in winter, summer and DST changes", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(boundaries[0][0]) });
  for (const [instant, today] of boundaries) {
    t.mock.timers.setTime(new Date(instant).getTime());
    assert.equal(bookingToday(), today);
    const yesterday = new Date(today + "T12:00:00Z"); yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    assert.equal(bookingSchema.safeParse({ ...body, check_in: yesterday.toISOString().slice(0, 10), check_out: "2099-01-03" }).success, false);
    assert.equal(bookingSchema.safeParse({ ...body, check_in: today }).success, true);
    assert.equal(bookingSchema.safeParse(body).success, true);
  }
});

test("past saved check-in cannot be moved forward, edited, confirmed or cancelled by either participant", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2027-07-01T22:00:00Z") });
  let guest = user.id, owner = "host";
  t.mock.method(globalThis, "fetch", async (input: unknown, init: RequestInit) => {
    const path = new URL(String(input)).pathname;
    if (path === "/auth/v1/user") return Response.json(user);
    assert.equal(init.method, "GET", "Past bookings must not reach a write");
    if (path === "/rest/v1/properties") return Response.json([{ owner_id: owner }]);
    return Response.json([{ ...body, booking_id: "b1", guest_id: guest, status: "pending", check_in: "2027-07-01" }]);
  });
  for (const role of ["guest", "owner"]) {
    guest = role === "guest" ? user.id : "other"; owner = role === "owner" ? user.id : "host";
    for (const [route, method, payload] of [
      ["/bookings/b1", "PUT", body], ["/bookings/b1/cancel", "POST", undefined],
      ["/bookings/b1", "DELETE", undefined],
      ...(role === "owner" ? [["/bookings/b1/confirm", "POST", undefined]] : []),
    ] as const) {
      const response = await app.request(route!, { method, headers: { Cookie: cookie, "Content-Type": "application/json" },
        ...(payload ? { body: JSON.stringify(payload) } : {}) });
      assert.equal(response.status, 409);
    }
  }
});

test("a database date rejection after API validation is a clear conflict", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: unknown) => {
    const path = new URL(String(input)).pathname;
    if (path === "/auth/v1/user") return Response.json(user);
    if (path === "/rest/v1/properties") return Response.json([{ max_guests: 2 }]);
    return Response.json({ code: "23514", message: "Check-in cannot be in the past" }, { status: 400 });
  });
  const response = await app.request("/bookings", { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "This booking cannot be created. Check its dates and status." });
});
