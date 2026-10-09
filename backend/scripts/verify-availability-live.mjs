// Run from backend after migration 020:
// node --import tsx scripts/verify-availability-live.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { serve } from "@hono/node-server";

const accounts = JSON.parse(await readFile(new URL("../../requests/local/ownership-accounts.json", import.meta.url), "utf8"));
const { default: app } = await import("../src/app.ts");
const { env } = await import("../src/env.ts");
const server = serve({ fetch: app.fetch, hostname: "127.0.0.1", port: 0 });
if (!server.listening) await new Promise(resolve => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const host = { cookies: new Map() }, guest = { cookies: new Map() }, anon = { cookies: new Map() };
const bookingIds = new Set();
let propertyId, passed = 0, failed = false;
async function call(actor, path, method = "GET", body) {
  const response = await fetch(base + path, {
    method, signal: AbortSignal.timeout(20000),
    headers: { Origin: env.frontendUrl, "Content-Type": "application/json",
      Cookie: [...actor.cookies].map(([name, value]) => `${name}=${value}`).join("; ") },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(";")[0], index = pair.indexOf("=");
    const name = pair.slice(0, index), value = pair.slice(index + 1);
    if (value) actor.cookies.set(name, value); else actor.cookies.delete(name);
  }
  const data = await response.json();
  if (method === "POST" && response.status === 201) {
    if (path === "/properties") propertyId = data.property_id;
    if (path === "/bookings") bookingIds.add(data.booking_id);
  }
  return { status: response.status, data, cache: response.headers.get("Cache-Control") };
}
function check(label, result, expected) {
  assert.equal(result.status, expected, `${label}: unexpected HTTP status`);
  passed++; console.log(`PASS ${label}: HTTP ${result.status}`);
  return result.data;
}
async function publicDates(label, expected) {
  const result = await call(anon, `/properties/${propertyId}/availability`);
  assert.deepEqual(check(label, result, 200), expected);
  assert.match(result.cache, /no-store/);
}
try {
  check("host login", await call(host, "/auth/login", "POST", accounts.host), 200);
  check("guest login", await call(guest, "/auth/login", "POST", accounts.guest), 200);
  check("create disposable property", await call(host, "/properties", "POST", {
    title: `Calendar disposable ${Date.now()}`, description: "Availability test fixture", location: "Calendar test", price_per_night: 100, max_guests: 2,
  }), 201);
  await publicDates("anonymous empty calendar", []);
  const dates = { check_in: "2099-01-10", check_out: "2099-01-14" };
  const booking = check("guest creates pending booking", await call(guest, "/bookings", "POST", {
    property_id: propertyId, guest_name: "Private fixture guest", guest_email: accounts.guest.email, guests: 1, ...dates,
  }), 201);
  await publicDates("anonymous sees pending dates only", [dates]);
  const direct = await fetch(`${env.supabaseUrl}/rest/v1/rpc/get_property_availability`, {
    method: "POST", signal: AbortSignal.timeout(20000),
    headers: { apikey: env.supabaseKey, "Content-Type": "application/json" }, body: JSON.stringify({ p_property_id: propertyId }),
  });
  assert.equal(direct.status, 200);
  assert.deepEqual(await direct.json(), [dates]);
  passed++; console.log("PASS direct anonymous Supabase RPC returns dates only");
  check("anonymous booking details remain private", await call(anon, `/bookings/${booking.booking_id}`), 401);
  check("confirm booking", await call(host, `/bookings/${booking.booking_id}/confirm`, "POST"), 200);
  await publicDates("confirmed dates remain blocked", [dates]);
  check("cancel booking", await call(guest, `/bookings/${booking.booking_id}/cancel`, "POST"), 200);
  await publicDates("cancellation frees calendar dates", []);
  check("missing property", await call(anon, "/properties/00000000-0000-4000-8000-000000000000/availability"), 404);
} catch (error) {
  failed = true;
  console.error(`FAIL: ${error instanceof assert.AssertionError ? error.message : "Live availability request/setup failed."}`);
} finally {
  for (const id of bookingIds) {
    const result = await call(host, `/bookings/${id}`, "DELETE").catch(() => ({ status: 0 }));
    if (result.status === 200) bookingIds.delete(id);
  }
  if (propertyId && !bookingIds.size) {
    const result = await call(host, `/properties/${propertyId}`, "DELETE").catch(() => ({ status: 0 }));
    if (result.status === 200) propertyId = undefined;
  }
  await new Promise(resolve => server.close(resolve));
  if (propertyId || bookingIds.size) {
    failed = true;
    console.error(`Cleanup needed: property=${propertyId || "none"}, bookings=${[...bookingIds]}`);
  }
}
console.log(`${failed ? "FAIL" : "PASS"}: ${passed} availability checks; cleanup ${propertyId || bookingIds.size ? "incomplete" : "complete"}.`);
process.exitCode = failed ? 1 : 0;
