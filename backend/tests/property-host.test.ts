import assert from "node:assert/strict";
import { test } from "node:test";
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_KEY = "test-key";
const { default: app } = await import("../src/app.js");

test("anonymous property host requests use the scoped public RPC", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: unknown, init: RequestInit) => {
    assert.equal(new URL(String(input)).pathname, "/rest/v1/rpc/get_property_host");
    assert.deepEqual(JSON.parse(String(init.body)), { p_property_id: "p1" });
    assert.equal(new Headers(init.headers).get("apikey"), "test-key");
    return Response.json({ name: "Emma Lindström", avatar_url: "https://example.com/avatar.jpg" });
  });
  const response = await app.request("/properties/p1/host");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { name: "Emma Lindström", avatar_url: "https://example.com/avatar.jpg" });
});

test("missing hosts and database failures return appropriate generic errors", async (t) => {
  let failed = false;
  t.mock.method(globalThis, "fetch", async () => failed ? Response.json({ message: "private database detail" }, { status: 500 }) : Response.json(null));
  assert.equal((await app.request("/properties/missing/host")).status, 404);
  failed = true;
  const old = console.error; console.error = () => {};
  try {
    const response = await app.request("/properties/p1/host");
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "Could not load host information" });
  } finally { console.error = old; }
});
