import assert from "node:assert/strict";
import { test } from "node:test";
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_KEY = "test-key";
const { default: app } = await import("../src/app.js");

test("anonymous availability uses a date-only RPC without reading private bookings", async (t) => {
  const dates = [{ check_in: "2099-01-10", check_out: "2099-01-14" }];
  t.mock.method(globalThis, "fetch", async (input: unknown, init: RequestInit) => {
    assert.equal(new URL(String(input)).pathname, "/rest/v1/rpc/get_property_availability");
    assert.deepEqual(JSON.parse(String(init.body)), { p_property_id: "p1" });
    return Response.json(dates);
  });
  const response = await app.request("/properties/p1/availability");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), dates);
  assert.match(response.headers.get("Cache-Control")!, /no-store/);
});

test("availability distinguishes no blocked dates, absent properties, and database failure", async (t) => {
  let state: "empty" | "missing" | "failure" = "empty";
  t.mock.method(globalThis, "fetch", async () => state === "failure"
    ? Response.json({ code: "PGRST202", message: "Internal database detail" }, { status: 404 })
    : Response.json(state === "missing" ? null : []));
  let response = await app.request("/properties/p1/availability");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), []);
  state = "missing";
  assert.equal((await app.request("/properties/p1/availability")).status, 404);
  state = "failure";
  t.mock.method(console, "error", () => {});
  response = await app.request("/properties/p1/availability");
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Could not load available dates. Please try again." });
});
