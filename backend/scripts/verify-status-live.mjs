// Run after database/021_booking_capacity.sql, from backend:
// node --import tsx scripts/verify-status-live.mjs
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
const cleanupOwners = new Map();
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
  const fixture = { title: 'VG4 disposable ' + Date.now(), description: 'Status verification', location: 'VG4 test', price_per_night: 100, max_guests: 2 };
  const property = check('create owner property', await api(actors.host, '/properties', 'POST', fixture), 201).property_id;
  let day = 1;
  function body(propertyId = property) {
    const start = '2099-07-' + String(day).padStart(2, '0');
    const end = '2099-07-' + String(day + 1).padStart(2, '0'); day += 2;
    return { property_id: propertyId, guest_name: 'VG4 guest', guest_email: actors.guest.email, guests: 1, check_in: start, check_out: end };
  }
  async function rawDenied(label, actor, payload, query, code) {
    const data = check(label, await direct(actor, query ? 'PATCH' : 'POST', payload, query), code === '42501' ? 403 : 400);
    assert.equal(data.code, code);
  }
  const creation = body();
  for (const status of ['confirmed', 'cancelled']) {
    check('API rejects new ' + status, await api(actors.guest, '/bookings', 'POST', { ...creation, status }), 409);
    await rawDenied('database rejects new ' + status, actors.guest, { ...creation, guest_id: actors.guest.id, status }, '', '23514');
  }
  for (const mode of ['API', 'database']) for (const role of ['guest', 'host']) for (const initial of ['pending', 'confirmed']) {
    const payload = body();
    const row = check(mode + ' ' + role + ' ' + initial + ' fixture', await api(actors.guest, '/bookings', 'POST', payload), 201);
    const path = '/bookings/' + row.booking_id, query = '?booking_id=eq.' + row.booking_id;
    check('guest confirm endpoint denied', await api(actors.guest, path + '/confirm', 'POST'), 403);
    check('guest confirm PUT denied', await api(actors.guest, path, 'PUT', { ...payload, status: 'confirmed' }), 403);
    await rawDenied('direct guest confirm denied', actors.guest, { status: 'confirmed' }, query, '42501');
    if (initial === 'confirmed') {
      if (mode === 'API') assert.equal(check('owner confirms', await api(actors.host, path + '/confirm', 'POST'), 200).status, 'confirmed');
      else assert.equal(check('direct owner confirms', await direct(actors.host, 'PATCH', { status: 'confirmed' }, query), 200)[0].status, 'confirmed');
      check('owner confirmed-to-pending denied', await api(actors.host, path, 'PUT', { ...payload, status: 'pending' }), 409);
      check('guest confirmed-to-pending denied', await api(actors.guest, path, 'PUT', { ...payload, status: 'pending' }), 409);
      await rawDenied('direct confirmed-to-pending denied', actors.host, { status: 'pending' }, query, '23514');
      assert.equal(check('edit without status preserves confirmation', await api(actors.guest, path, 'PUT', { ...payload, guest_name: 'Updated guest' }), 200).status, 'confirmed');
    }
    const result = mode === 'API'
      ? check(role + ' cancels ' + initial, await api(actors[role], path + '/cancel', 'POST'), 200)
      : check('direct ' + role + ' cancels ' + initial, await direct(actors[role], 'PATCH', { status: 'cancelled' }, query), 200)[0];
    assert.equal(result.status, 'cancelled');
    for (const actor of Object.values(actors)) {
      check('cancelled API detail edit denied', await api(actor, path, 'PUT', { ...payload, guest_name: 'Forbidden', status: 'cancelled' }), 409);
      check('cancelled API reopen denied', await api(actor, path, 'PUT', { ...payload, status: 'pending' }), 409);
      await rawDenied('cancelled direct detail edit denied', actor, { guest_name: 'Forbidden' }, query, '23514');
    }
    const saved = check('rejections preserve cancelled booking', await api(actors.guest, path), 200);
    assert.equal(saved.status, 'cancelled'); assert.notEqual(saved.guest_name, 'Forbidden');
  }
  // Reverse ownership makes the host test account unrelated without a third login.
  const other = check('create guest-owned property', await api(actors.guest, '/properties', 'POST', fixture), 201).property_id;
  cleanupOwners.set(other, actors.guest);
  const payload = body(other);
  const hidden = check('create unrelated-user fixture', await api(actors.guest, '/bookings', 'POST', payload), 201);
  cleanupOwners.set(hidden.booking_id, actors.guest);
  const path = '/bookings/' + hidden.booking_id, query = '?booking_id=eq.' + hidden.booking_id;
  for (const [route, method, data] of [[path + '/confirm', 'POST'], [path + '/cancel', 'POST'], [path, 'PUT', { ...payload, status: 'cancelled' }]])
    check('unrelated API mutation denied', await api(actors.host, route, method, data), 404);
  for (const status of ['confirmed', 'cancelled']) {
    const rows = check('unrelated direct mutation hidden', await direct(actors.host, 'PATCH', { status }, query), 200);
    assert.deepEqual(rows, []);
  }
  assert.equal(check('unrelated attempts preserve pending', await api(actors.guest, path), 200).status, 'pending');
} catch (error) {
  failed = true;
  console.error(`FAIL: ${error instanceof assert.AssertionError ? error.message : "Live request/setup failed; check applied migration and connection."}`);
} finally {
  for (const id of bookingIds) {
    const result = await api(cleanupOwners.get(id) ?? actors.host, `/bookings/${id}`, "DELETE").catch(() => ({ status: 0 }));
    if (result.status === 200) bookingIds.delete(id);
  }
  if (!bookingIds.size) for (const id of propertyIds) {
    const result = await api(cleanupOwners.get(id) ?? actors.host, `/properties/${id}`, "DELETE").catch(() => ({ status: 0 }));
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
