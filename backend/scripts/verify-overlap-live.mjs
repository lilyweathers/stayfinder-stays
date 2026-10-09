// Run after database/019_booking_overlap.sql, from backend:
// node --import tsx scripts/verify-overlap-live.mjs
// Uses the same gitignored test-account file as the VG1 runner.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { serve } from "@hono/node-server";
import { createServerClient } from "@supabase/ssr";

const credentials = JSON.parse(await readFile(new URL("../../requests/local/ownership-accounts.json", import.meta.url), "utf8"));
for (const role of ["host", "guest"]) {
  assert.equal(typeof credentials[role]?.email, "string", `Missing ${role} email`);
  assert.equal(typeof credentials[role]?.password, "string", `Missing ${role} password`);
}
const { default: app } = await import("../src/app.ts");
const { env } = await import("../src/env.ts");
const server = serve({ fetch: app.fetch, hostname: "127.0.0.1", port: 0 });
if (!server.listening) await new Promise(resolve => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const actors = { host: { cookies: new Map() }, guest: { cookies: new Map() } };
const propertyIds = new Set(), bookingIds = new Set();
let passed = 0, failed = false;
async function api(actor, path, method = "GET", body) {
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
    if (path === "/properties") propertyIds.add(data.property_id);
    if (path === "/bookings") bookingIds.add(data.booking_id);
  }
  return { status: response.status, data };
}
async function direct(actor, method, body, query = "") {
  const response = await fetch(`${env.supabaseUrl}/rest/v1/bookings${query}`, {
    method, signal: AbortSignal.timeout(20000),
    headers: { apikey: env.supabaseKey, Authorization: `Bearer ${actor.token}`,
      "Content-Type": "application/json", Prefer: "return=representation" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (method === "POST" && response.status === 201) for (const row of data) bookingIds.add(row.booking_id);
  return { status: response.status, data };
}
function check(label, result, expected) {
  assert.equal(result.status, expected, `${label}: unexpected HTTP status`);
  console.log(`PASS ${label}: HTTP ${result.status}`); passed++;
  return result.data;
}
function conflict(label, result, raw = false) {
  // PostgREST maps 23P01 to 400; Hono translates it to a user-facing 409.
  const data = check(label, result, raw ? 400 : 409);
  if (raw) assert.equal(data.code, "23P01");
  else assert.equal(data.error, "This property is already booked for the selected dates. Choose different dates.");
}
function body(actor, property, start, end) {
  return { property_id: property, guest_name: "VG2 guest", guest_email: actor.email,
    guests: 1, check_in: start, check_out: end };
}
async function race(label, property, start, end, raw) {
  const results = await Promise.all(Object.values(actors).map(actor => raw
    ? direct(actor, "POST", { ...body(actor, property, start, end), guest_id: actor.id })
    : api(actor, "/bookings", "POST", body(actor, property, start, end))));
  const rejectedStatus = raw ? 400 : 409;
  assert.deepEqual(results.map(row => row.status).sort(), [201, rejectedStatus], `${label}: exactly one write must succeed`);
  conflict(label + " loser", results.find(row => row.status === rejectedStatus), raw);
  const persisted = check(label + " persisted rows", await api(actors.host, `/bookings?property_id=${property}`), 200);
  assert.equal(persisted.filter(row => row.check_in === start && row.check_out === end && row.status !== "cancelled").length, 1);
  console.log(`PASS ${label}: exactly one active booking persisted`); passed++;
}
try {
  for (const role of ["host", "guest"]) {
    const actor = actors[role]; actor.email = credentials[role].email;
    check(`${role} login`, await api(actor, "/auth/login", "POST", credentials[role]), 200);
    actor.id = check(`${role} verified identity`, await api(actor, "/auth/me"), 200).user.id;
    // Read only the session produced by actual API login; never print its token.
    const client = createServerClient(env.supabaseUrl, env.supabaseKey, {
      cookies: { getAll: () => [...actor.cookies].map(([name, value]) => ({ name, value })), setAll() {} },
    });
    actor.token = (await client.auth.getSession()).data.session?.access_token;
    assert.ok(actor.token, "API login session is required for direct RLS checks");
  }
  assert.notEqual(actors.host.id, actors.guest.id);
  const fixture = { title: `VG2 disposable ${Date.now()}`, description: "Overlap verification", location: "VG2 test", price_per_night: 100, max_guests: 2 };
  const property = check("create disposable property", await api(actors.host, "/properties", "POST", fixture), 201).property_id;
  const originalBody = body(actors.host, property, "2099-01-10", "2099-01-14");
  const original = check("create pending blocker", await api(actors.host, "/bookings", "POST", originalBody), 201);
  check("other guest cannot read blocker", await api(actors.guest, `/bookings/${original.booking_id}`), 404);
  for (const [label, start, end] of [
    ["exact", "2099-01-10", "2099-01-14"], ["contained", "2099-01-11", "2099-01-13"],
    ["enclosing", "2099-01-09", "2099-01-15"], ["left edge", "2099-01-09", "2099-01-11"],
    ["right edge", "2099-01-13", "2099-01-15"],
  ]) conflict(`${label} overlap against hidden booking`, await api(actors.guest, "/bookings", "POST", body(actors.guest, property, start, end)));
  const adjacentBody = body(actors.guest, property, "2099-01-14", "2099-01-16");
  const adjacent = check("checkout-to-checkin adjacency", await api(actors.guest, "/bookings", "POST", adjacentBody), 201);
  check("preceding adjacency", await api(actors.guest, "/bookings", "POST", body(actors.guest, property, "2099-01-08", "2099-01-10")), 201);
  const adjacentPath = `/bookings/${adjacent.booking_id}`;
  check("unchanged booking does not clash with itself", await api(actors.guest, adjacentPath, "PUT", adjacentBody), 200);
  const before = check("read update fixture", await api(actors.guest, adjacentPath), 200);
  conflict("overlapping API update", await api(actors.guest, adjacentPath, "PUT", { ...adjacentBody, check_in: "2099-01-13" }));
  conflict("overlapping direct database update", await direct(actors.guest, "PATCH", { check_in: "2099-01-13" }, `?booking_id=eq.${adjacent.booking_id}`), true);
  assert.deepEqual(check("failed updates preserve booking", await api(actors.guest, adjacentPath), 200), before);
  check("host confirms blocker", await api(actors.host, `/bookings/${original.booking_id}/confirm`, "POST"), 200);
  conflict("confirmed booking blocks dates", await api(actors.guest, "/bookings", "POST", body(actors.guest, property, "2099-01-11", "2099-01-13")));
  check("host cancels blocker", await api(actors.host, `/bookings/${original.booking_id}/cancel`, "POST"), 200);
  check("cancelled booking does not block dates", await api(actors.guest, "/bookings", "POST", body(actors.guest, property, "2099-01-10", "2099-01-14")), 201);
  const otherProperty = check("create second property", await api(actors.host, "/properties", "POST", fixture), 201).property_id;
  check("same dates on different property", await api(actors.guest, "/bookings", "POST", body(actors.guest, otherProperty, "2099-01-10", "2099-01-14")), 201);
  await race("simultaneous API creates", property, "2099-02-01", "2099-02-04", false);
  await race("simultaneous direct Supabase creates", property, "2099-03-01", "2099-03-04", true);
} catch (error) {
  failed = true;
  console.error(`FAIL: ${error instanceof assert.AssertionError ? error.message : "Live request/setup failed; check applied migration and connection."}`);
} finally {
  for (const id of bookingIds) {
    const result = await api(actors.host, `/bookings/${id}`, "DELETE").catch(() => ({ status: 0 }));
    if (result.status === 200) bookingIds.delete(id);
  }
  if (!bookingIds.size) for (const id of propertyIds) {
    const result = await api(actors.host, `/properties/${id}`, "DELETE").catch(() => ({ status: 0 }));
    if (result.status === 200) propertyIds.delete(id);
  }
  // Local logout preserves the user's other browser sessions; tokens stay in memory.
  for (const actor of Object.values(actors)) if (actor.token) await fetch(`${env.supabaseUrl}/auth/v1/logout?scope=local`, {
    method: "POST", signal: AbortSignal.timeout(10000), headers: { apikey: env.supabaseKey, Authorization: `Bearer ${actor.token}` },
  }).catch(() => {});
  await new Promise(resolve => server.close(resolve));
  if (bookingIds.size || propertyIds.size) {
    failed = true;
    console.error(`Cleanup needed for disposable IDs: bookings=${[...bookingIds]} properties=${[...propertyIds]}`);
  }
}
console.log(`${failed ? "FAIL" : "PASS"}: ${passed} live checks; cleanup ${bookingIds.size || propertyIds.size ? "incomplete" : "complete"}.`);
process.exitCode = failed ? 1 : 0;
