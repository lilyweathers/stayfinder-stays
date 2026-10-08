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

test("profile edits require authentication and reject empty or forged fields", async (t) => {
  assert.equal((await app.request("/auth/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Guest" }) })).status, 401);
  t.mock.method(globalThis, "fetch", async (input: unknown, init: RequestInit) => {
    assert.equal(new URL(String(input)).pathname, "/auth/v1/user");
    assert.notEqual(init.method, "PUT");
    return Response.json(user);
  });
  for (const body of [{ name: "  " }, { name: "x".repeat(101) }, { name: "Guest", id: "victim" }, { name: "Guest", email: "other@example.com" }]) {
    assert.equal((await request("/auth/profile", "PATCH", body)).status, 400);
  }
});

test("profile update changes only the current user's display name and reads it back", async (t) => {
  let stored = { ...user, user_metadata: { display_name: "Before", preference: "kept" } };
  let writes = 0;
  t.mock.method(globalThis, "fetch", async (input: unknown, init: RequestInit) => {
    assert.equal(new URL(String(input)).pathname, "/auth/v1/user");
    if (init.method === "PUT") {
      assert.equal(new Headers(init.headers).get("Authorization"), "Bearer " + token);
      const body = JSON.parse(String(init.body));
      assert.equal(body.data.display_name, "New Name");
      assert.equal(body.email, undefined);
      stored = { ...stored, user_metadata: { ...stored.user_metadata, ...body.data } };
      writes++;
    }
    return Response.json(stored);
  });
  const response = await request("/auth/profile", "PATCH", { name: "  New Name  " });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.user_metadata.display_name, "New Name");
  const current = await request("/auth/me", "GET");
  assert.equal((await current.json()).user.user_metadata.display_name, "New Name");
  assert.equal(writes, 1);
});

test("registration saves a name as user metadata", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: unknown, init: RequestInit) => {
    assert.equal(new URL(String(input)).pathname, "/auth/v1/signup");
    const body = JSON.parse(String(init.body));
    assert.equal(body.data.display_name, "New Guest");
    return Response.json({ ...user, user_metadata: body.data });
  });
  const response = await app.request("/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: user.email, password: "secret123", name: " New Guest " }) });
  assert.equal(response.status, 201);
  assert.equal((await response.json()).user.user_metadata.display_name, "New Guest");
});
