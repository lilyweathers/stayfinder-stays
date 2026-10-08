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
  t.mock.method(globalThis, "fetch", async (input: unknown) => {
    if (new URL(String(input)).pathname === "/auth/v1/user") return Response.json(user);
    return Response.json({ code: "42501", message: "Ownership denied" }, { status: 403 });
  });
  assert.equal((await request("/properties", "POST", property)).status, 403);
  assert.equal((await request("/bookings", "POST", booking)).status, 403);
  assert.equal((await request("/bookings/b1", "PUT", booking)).status, 403);
});
