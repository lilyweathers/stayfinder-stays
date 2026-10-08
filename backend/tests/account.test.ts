import assert from "node:assert/strict";
import { test } from "node:test";

process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_KEY = "test-key";
process.env.SUPABASE_ADMIN_KEY = "test-admin-key";
const { default: app } = await import("../src/app.js");
const { env } = await import("../src/env.js");
const user = { id: "a1100000-0000-4000-8000-000000000001", email: "current@example.com", aud: "authenticated" };
const token = ["header", Buffer.from(JSON.stringify({ exp: 4102444800, sub: user.id })).toString("base64url"), "signature"].join(".");
const session = { access_token: token, refresh_token: "refresh", expires_at: 4102444800, expires_in: 3600, token_type: "bearer", user };
const cookie = "sb-test-auth-token=base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
const request = (body: unknown) => app.request("/auth/account", {
  method: "DELETE", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify(body),
});

test("account deletion requires auth, password, and configured admin key", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json(user));
  assert.equal((await app.request("/auth/account", { method: "DELETE" })).status, 401);
  assert.equal((await request({ password: "" })).status, 400);
  assert.equal((await request({ password: "secret", user_id: "victim" })).status, 400);
  env.supabaseAdminKey = "";
  try { assert.equal((await request({ password: "secret" })).status, 503); }
  finally { env.supabaseAdminKey = "test-admin-key"; }
});

test("account deletion verifies password and identity before deleting only the current user", async (t) => {
  let mode = "wrong-password";
  let deletions = 0;
  t.mock.method(globalThis, "fetch", async (input: unknown, init: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname === "/auth/v1/user") return Response.json(user);
    if (url.pathname === "/auth/v1/token") {
      assert.deepEqual(JSON.parse(String(init.body)), { email: user.email, password: "secret", gotrue_meta_security: {} });
      assert.equal(new Headers(init.headers).get("apikey"), "test-key");
      if (mode === "wrong-password") return Response.json({ msg: "Invalid login credentials" }, { status: 400 });
      return Response.json({ ...session, user: mode === "wrong-user" ? { ...user, id: "victim" } : user });
    }
    if (url.pathname === `/auth/v1/admin/users/${user.id}`) {
      assert.equal(init.method, "DELETE");
      assert.equal(new Headers(init.headers).get("apikey"), "test-admin-key");
      deletions++;
      return mode === "delete-error" ? Response.json({ msg: "Database error" }, { status: 500 }) : Response.json(user);
    }
    assert.equal(url.pathname, "/auth/v1/logout");
    return new Response(null, { status: 204 });
  });
  assert.equal((await request({ password: "secret" })).status, 400);
  mode = "wrong-user";
  assert.equal((await request({ password: "secret" })).status, 400);
  assert.equal(deletions, 0);
  mode = "delete-error";
  assert.equal((await request({ password: "secret" })).status, 500);
  mode = "success";
  const response = await request({ password: "secret" });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie") || "", /Max-Age=0/);
  assert.deepEqual(await response.json(), { message: "Your account has been deleted" });
  assert.equal(deletions, 2);
});
