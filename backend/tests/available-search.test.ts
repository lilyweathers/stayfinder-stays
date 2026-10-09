import assert from "node:assert/strict";
import { test } from "node:test";
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_KEY = "test-key";
const { default: app } = await import("../src/app.js");
test("available-date search combines all filters and both sort orders in a single public RPC", async (t) => {
 let sort = "asc";
 t.mock.method(globalThis, "fetch", async (input: unknown, init: RequestInit) => {
  assert.equal(new URL(String(input)).pathname, "/rest/v1/rpc/search_available_properties");
  assert.deepEqual(JSON.parse(String(init.body)), { p_check_in: "2099-01-10", p_check_out: "2099-01-14", p_location: "Gothenburg", p_max_price: 1200, p_guests: 2, p_sort: sort });
  return Response.json([{ property_id: "available", price_per_night: 100 }]);
 });
 for (sort of ["asc", "desc"]) {
  const result = await app.request("/properties?check_in=2099-01-10&check_out=2099-01-14&location=%20Gothenburg%20&max_price=1200&guests=2&sort=" + sort);
  assert.equal(result.status, 200); assert.equal((await result.json())[0].property_id, "available");
 }
});
test("invalid or incomplete dates never reach the database", async (t) => {
 t.mock.method(globalThis, "fetch", () => { throw new Error("Invalid dates queried database"); });
 for (const query of [
  "check_in=2099-01-10", "check_out=2099-01-14", "check_in=&check_out=2099-01-14",
  "check_in=2099-02-29&check_out=2099-03-02", "check_in=2099-02-30&check_out=2099-03-02",
  "check_in=2099-1-10&check_out=2099-01-14", "check_in=0000-01-10&check_out=2099-01-14",
  "check_in=2099-01-10&check_out=2099-01-10", "check_in=2099-01-14&check_out=2099-01-10",
  "check_in=2000-01-10&check_out=2099-01-14", "check_in=abc&check_out=2099-01-14",
 ]) assert.equal((await app.request("/properties?" + query)).status, 400, query);
});
test("empty date fields use normal browsing and database validation errors are clear", async (t) => {
 let databaseError = "";
 t.mock.method(console, "error", () => {});
 t.mock.method(globalThis, "fetch", async (input: unknown) => {
  const path = new URL(String(input)).pathname;
  if (path === "/rest/v1/properties") return Response.json([]);
  return databaseError ? Response.json({ code: databaseError, message: "Private details" }, { status: 400 }) : Response.json([]);
 });
 assert.equal((await app.request("/properties?check_in=&check_out=")).status, 200);
 for (databaseError of ["23514", "22007", "22008", "XX000"]) {
  const response = await app.request("/properties?check_in=2099-01-10&check_out=2099-01-14");
  assert.equal(response.status, databaseError === "XX000" ? 500 : 400);
  assert.ok(!JSON.stringify(await response.json()).includes("Private details"));
 }
});
