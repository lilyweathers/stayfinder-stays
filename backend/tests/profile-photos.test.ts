import assert from "node:assert/strict";
import { test } from "node:test";

process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_KEY = "test-key";
process.env.SUPABASE_ADMIN_KEY = "test-admin-key";
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


const photo = { content_type: "image/png", data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=" };

test("profile photo validation rejects unsupported, forged, malformed, and oversized uploads", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: unknown) => {
    assert.equal(new URL(String(input)).pathname, "/auth/v1/user");
    return Response.json(user);
  });
  for (const invalid of [ { ...photo, content_type: "image/svg+xml" }, { ...photo, data: "!!!!" }, { ...photo, data: Buffer.from("not a picture").toString("base64") }, { ...photo, data: "a".repeat(7 * 1024 * 1024) } ]) {
    assert.equal((await request("/auth/profile", "PATCH", { name: "Guest", photo: invalid })).status, 400);
    const registration = await app.request("/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: user.email, password: "secret123", photo: invalid }) });
    assert.equal(registration.status, 400);
  }
  assert.equal((await request("/auth/profile", "PATCH", { name: "Guest", photo, remove_photo: true })).status, 400);
});

test("authenticated photo upload uses the user's folder and saves a persistent avatar URL", async (t) => {
  let stored = { ...user, user_metadata: { display_name: "Guest", avatar_url: null as string | null } };
  let uploads = 0;
  t.mock.method(globalThis, "fetch", async (input: unknown, init: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname.startsWith("/storage/v1/object/profile-photos/")) {
      assert.match(url.pathname, /^\/storage\/v1\/object\/profile-photos\/guest-a\/[a-f0-9-]+\.png$/);
      assert.equal(new Headers(init.headers).get("Authorization"), "Bearer " + token);
      assert.equal(new Headers(init.headers).get("content-type"), "image/png");
      uploads++;
      return Response.json({ Key: url.pathname });
    }
    assert.equal(url.pathname, "/auth/v1/user");
    if (init.method === "PUT") {
      const body = JSON.parse(String(init.body));
      stored = { ...stored, user_metadata: { ...stored.user_metadata, ...body.data } };
    }
    return Response.json(stored);
  });
  const response = await request("/auth/profile", "PATCH", { name: "Guest", photo });
  assert.equal(response.status, 200);
  assert.match((await response.json()).user.user_metadata.avatar_url, /^https:\/\/test.supabase.co\/storage\/v1\/object\/public\/profile-photos\/guest-a\//);
  assert.equal(uploads, 1);
  assert.equal((await (await request("/auth/me", "GET")).json()).user.user_metadata.avatar_url, stored.user_metadata.avatar_url);
});

test("photo removal clears metadata and deletes only a generated file in the user's own folder", async (t) => {
  const old = "https://test.supabase.co/storage/v1/object/public/profile-photos/guest-a/aabbcc.png";
  let deletes = 0;
  t.mock.method(globalThis, "fetch", async (input: unknown, init: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname === "/storage/v1/object/profile-photos") {
      assert.deepEqual(JSON.parse(String(init.body)).prefixes, ["guest-a/aabbcc.png"]);
      deletes++; return Response.json([]);
    }
    assert.equal(url.pathname, "/auth/v1/user");
    if (init.method === "PUT") {
      assert.equal(JSON.parse(String(init.body)).data.avatar_url, null);
      return Response.json({ ...user, user_metadata: { display_name: "Guest", avatar_url: null } });
    }
    return Response.json({ ...user, user_metadata: { avatar_url: old } });
  });
  assert.equal((await request("/auth/profile", "PATCH", { name: "Guest", remove_photo: true })).status, 200);
  assert.equal(deletes, 1);
});

test("registration uploads before confirmation and includes the photo URL in signup metadata", async (t) => {
  let uploads = 0;
  t.mock.method(globalThis, "fetch", async (input: unknown, init: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname.startsWith("/storage/v1/object/profile-photos/registration/")) {
      assert.equal(new Headers(init.headers).get("apikey"), "test-admin-key");
      uploads++; return Response.json({ Key: url.pathname });
    }
    assert.equal(url.pathname, "/auth/v1/signup");
    const body = JSON.parse(String(init.body));
    assert.match(body.data.avatar_url, /\/profile-photos\/registration\//);
    return Response.json({ ...user, user_metadata: body.data, identities: [{ id: user.id }] });
  });
  const response = await app.request("/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: user.email, password: "secret123", name: "Guest", photo }) });
  assert.equal(response.status, 201);
  assert.equal((await response.json()).confirmationRequired, true);
  assert.equal(uploads, 1);
});

test("failed registration removes the staged photo", async (t) => {
  let removed = 0;
  t.mock.method(globalThis, "fetch", async (input: unknown, init: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname.startsWith("/storage/v1/object/profile-photos/registration/")) return Response.json({ Key: url.pathname });
    if (url.pathname === "/storage/v1/object/profile-photos") {
      assert.match(JSON.parse(String(init.body)).prefixes[0], /^registration\/[a-f0-9-]+\/[a-f0-9-]+\.png$/);
      removed++; return Response.json([]);
    }
    assert.equal(url.pathname, "/auth/v1/signup");
    return Response.json({ msg: "Signup failed" }, { status: 400 });
  });
  const response = await app.request("/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: user.email, password: "secret123", photo }) });
  assert.equal(response.status, 400);
  assert.equal(removed, 1);
});

test("upload failure leaves profile unchanged, and requests over the body limit return 413", async (t) => {
  let writes = 0;
  t.mock.method(globalThis, "fetch", async (input: unknown, init: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname.startsWith("/storage/v1/")) return Response.json({ message: "Bucket unavailable" }, { status: 503 });
    if (init.method === "PUT") writes++;
    return Response.json(user);
  });
  assert.equal((await request("/auth/profile", "PATCH", { name: "Guest", photo })).status, 503);
  assert.equal(writes, 0);
  const huge = await app.request("/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ padding: "x".repeat(8 * 1024 * 1024) }) });
  assert.equal(huge.status, 413);
});
