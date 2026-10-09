// Run after database/025_available_property_search.sql, from backend:
// node --import tsx scripts/verify-search-live.mjs
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
  const anonymous = { cookies: new Map() }, location = 'VG7 ' + Date.now();
  const ids = [];
  for (const [title, price, capacity, city] of [
    ['Blocked', 100, 4, location], ['Cancelled', 200, 4, location], ['Available', 300, 4, location],
    ['Small', 400, 1, location], ['Other city', 500, 4, location + ' elsewhere'],
  ]) ids.push(check('create ' + title, await api(actors.host, '/properties', 'POST', { title: 'VG7 ' + title, description: 'Disposable search fixture', location: city, price_per_night: price, max_guests: capacity }), 201).property_id);
  const body = { property_id: ids[0], guest_name: 'VG7 guest', guest_email: actors.guest.email, guests: 1, check_in: '2099-01-10', check_out: '2099-01-14' };
  const blocker = check('create pending blocker', await api(actors.guest, '/bookings', 'POST', body), 201);
  const cancelled = check('create cancelled fixture', await api(actors.guest, '/bookings', 'POST', { ...body, property_id: ids[1] }), 201);
  check('cancel fixture', await api(actors.guest, '/bookings/' + cancelled.booking_id + '/cancel', 'POST'), 200);
  async function search(start, end, extra = {}) {
    return api(anonymous, '/properties?' + new URLSearchParams({ location, check_in: start, check_out: end, ...extra }));
  }
  for (const [start, end] of [['2099-01-10','2099-01-14'], ['2099-01-11','2099-01-12'], ['2099-01-09','2099-01-15'], ['2099-01-09','2099-01-11'], ['2099-01-13','2099-01-15']]) {
    const rows = check('pending overlap excluded ' + start, await search(start, end), 200);
    assert.ok(!rows.some(p => p.property_id === ids[0])); assert.ok(rows.some(p => p.property_id === ids[1]));
    assert.equal(rows.length, 4);
    assert.ok(rows.every(p => !('guest_email' in p) && !('booking_id' in p)));
  }
  check('owner confirms blocker', await api(actors.host, '/bookings/' + blocker.booking_id + '/confirm', 'POST'), 200);
  assert.ok(!check('confirmed overlap excluded', await search(body.check_in, body.check_out), 200).some(p => p.property_id === ids[0]));
  for (const [start, end] of [['2099-01-08','2099-01-10'], ['2099-01-14','2099-01-16']]) {
    const rows = check('adjacent stay allowed ' + start, await search(start, end), 200);
    assert.equal(rows.length, 5); assert.ok(rows.some(p => p.property_id === ids[0]));
  }
  for (const sort of ['asc', 'desc']) {
    const rows = check('combined filters ' + sort, await search(body.check_in, body.check_out, { location: location.toUpperCase(), max_price: '350', guests: '2', sort }), 200);
    assert.deepEqual(rows.map(p => p.property_id), sort === 'asc' ? [ids[1], ids[2]] : [ids[2], ids[1]]);
  }
  assert.deepEqual(check('inclusive maximum price and capacity', await search(body.check_in, body.check_out, { max_price: '200', guests: '4' }), 200).map(p => p.property_id), [ids[1]]);
  assert.deepEqual(check('zero maximum price gives empty result', await search(body.check_in, body.check_out, { max_price: '0' }), 200), []);
  for (const query of ['check_in=2099-01-10', 'check_out=2099-01-14', 'check_in=2099-02-29&check_out=2099-03-02', 'check_in=2099-01-10&check_out=2099-01-10', 'check_in=2000-01-01&check_out=2099-01-14'])
    check('invalid/incomplete API dates', await api(anonymous, '/properties?' + query), 400);
  async function rpc(payload) {
    const response = await fetch(env.supabaseUrl + '/rest/v1/rpc/search_available_properties', { method: 'POST', signal: AbortSignal.timeout(20000),
      headers: { apikey: env.supabaseKey, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    return { status: response.status, data: await response.json() };
  }
  const raw = check('anonymous direct database combined search', await rpc({ p_check_in: body.check_in, p_check_out: body.check_out, p_location: location, p_max_price: 350, p_guests: 2, p_sort: 'desc' }), 200);
  assert.deepEqual(raw.map(p => p.property_id), [ids[2], ids[1]]);
  for (const dates of [{ p_check_in: null, p_check_out: body.check_out }, { p_check_in: '2000-01-01', p_check_out: body.check_out }, { p_check_in: body.check_in, p_check_out: body.check_in }])
    assert.equal(check('direct invalid dates denied', await rpc(dates), 400).code, '23514');
  check('cancel confirmed blocker', await api(actors.guest, '/bookings/' + blocker.booking_id + '/cancel', 'POST'), 200);
  assert.ok(check('cancellation releases search availability', await search(body.check_in, body.check_out), 200).some(p => p.property_id === ids[0]));
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
