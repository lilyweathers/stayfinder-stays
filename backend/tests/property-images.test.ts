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

test("image URL validation rejects unsafe URLs before database writes", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: unknown) => {
    assert.equal(new URL(String(input)).pathname, "/auth/v1/user");
    return Response.json(user);
  });
  for (const image_url of ["bad-url", "http://example.com/photo.jpg", "javascript:alert(1)"]) {
    assert.equal((await request("/properties", "POST", { ...property, image_url })).status, 400);
    assert.equal((await request("/properties/p1", "PATCH", { image_url })).status, 400);
  }
});

test("property creation stores photos and owner updates can replace or clear them", async (t) => {
  let expected: string | null = "https://images.unsplash.com/photo-example.jpg";
  t.mock.method(globalThis, "fetch", async (input: unknown, init: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname === "/auth/v1/user") return Response.json(user);
    assert.equal(url.pathname, "/rest/v1/properties");
    const body = JSON.parse(String(init.body));
    assert.equal(body.image_url, expected);
    if (init.method === "POST") assert.equal(body.owner_id, user.id);
    else assert.equal(url.searchParams.get("owner_id"), "eq." + user.id);
    const row = { ...property, ...body, property_id: "p1", owner_id: user.id };
    return Response.json(init.method === "POST" ? row : [row]);
  });
  assert.equal((await request("/properties", "POST", { ...property, image_url: expected })).status, 201);
  expected = "https://example.com/replacement.jpg";
  assert.equal((await request("/properties/p1", "PATCH", { image_url: expected })).status, 200);
  expected = null;
  assert.equal((await request("/properties/p1", "PATCH", { image_url: null })).status, 200);
});
