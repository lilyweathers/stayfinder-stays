import assert from "node:assert/strict";
import { test } from "node:test";
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_KEY = "test-key";
const { default: app } = await import("../src/app.js");

test("public profile reads need no login and expose only name, photo, and bio", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: unknown, init: RequestInit) => {
    assert.equal(new URL(String(input)).pathname, "/rest/v1/rpc/get_public_profile");
    assert.deepEqual(JSON.parse(String(init.body)), { p_user_id: "member-id" });
    return Response.json({ name: "Oliver Berglund", avatar_url: null, bio: "I enjoy weekend trips.", email: "private@example.invalid", id: "private-id", created_at: "private-date" });
  });
  const response = await app.request("/profiles/member-id");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { name: "Oliver Berglund", avatar_url: null, bio: "I enjoy weekend trips." });
});

test("public profiles handle missing users, database errors, and reject editing", async (t) => {
  let failed = false;
  t.mock.method(globalThis, "fetch", async () => failed ? Response.json({ message: "private detail" }, { status: 500 }) : Response.json(null));
  assert.equal((await app.request("/profiles/missing")).status, 404);
  assert.equal((await app.request("/profiles/member-id", { method: "PATCH" })).status, 404);
  failed = true;
  t.mock.method(console, "error", () => {});
  const response = await app.request("/profiles/member-id");
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Could not load this profile" });
});
