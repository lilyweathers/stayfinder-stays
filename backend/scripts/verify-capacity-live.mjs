// Run after database/021_booking_capacity.sql, from backend:
// node --import tsx scripts/verify-capacity-live.mjs
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
  const fixture = { title: 'VG3 disposable ' + Date.now(), description: 'Capacity verification', location: 'VG3 test', price_per_night: 100, max_guests: 2 };
  const property = check('create capacity-2 property', await api(actors.host, '/properties', 'POST', fixture), 201).property_id;
  const body = { property_id: property, guest_name: 'VG3 guest', guest_email: actors.guest.email, guests: 2, check_in: '2099-05-10', check_out: '2099-05-12' };
  const booking = check('exact capacity accepted', await api(actors.guest, '/bookings', 'POST', body), 201);
  const path = '/bookings/' + booking.booking_id;
  check('oversized API create', await api(actors.guest, '/bookings', 'POST', { ...body, guests: 3, check_in: '2099-06-10', check_out: '2099-06-12' }), 400);
  for (const key of ['max_guests', 'capacity']) check('forged ' + key, await api(actors.guest, '/bookings', 'POST', { ...body, guests: 3, [key]: 99 }), 400);
  check('oversized API update', await api(actors.guest, path, 'PUT', { ...body, guests: 3 }), 400);
  for (const [label, method, payload, query] of [
    ['direct oversized create', 'POST', { ...body, guest_id: actors.guest.id, guests: 3, check_in: '2099-06-10', check_out: '2099-06-12' }, ''],
    ['direct oversized update', 'PATCH', { guests: 3 }, '?booking_id=eq.' + booking.booking_id],
  ]) {
    const data = check(label, await direct(actors.guest, method, payload, query), 400);
    assert.equal(data.code, '23514'); assert.equal(data.message, 'Guest count exceeds property capacity');
  }
  assert.equal(check('failed updates preserve guest count', await api(actors.guest, path), 200).guests, 2);
  const propertyPath = '/properties/' + property;
  check('unsafe host capacity reduction', await api(actors.host, propertyPath, 'PATCH', { max_guests: 1 }), 409);
  check('reduce reservation guests', await api(actors.guest, path, 'PUT', { ...body, guests: 1 }), 200);
  check('safe capacity reduction', await api(actors.host, propertyPath, 'PATCH', { max_guests: 1 }), 200);
  check('API uses changed capacity', await api(actors.guest, path, 'PUT', body), 400);
  const changed = check('database uses changed capacity', await direct(actors.guest, 'PATCH', { guests: 2 }, '?booking_id=eq.' + booking.booking_id), 400);
  assert.equal(changed.code, '23514'); assert.equal(changed.message, 'Guest count exceeds property capacity');
  check('increase property capacity', await api(actors.host, propertyPath, 'PATCH', { max_guests: 3 }), 200);
  check('new exact capacity accepted on update', await api(actors.guest, path, 'PUT', { ...body, guests: 3 }), 200);
  check('cancel booking', await api(actors.guest, path + '/cancel', 'POST'), 200);
  check('cancelled booking permits reduction', await api(actors.host, propertyPath, 'PATCH', { max_guests: 1 }), 200);
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
