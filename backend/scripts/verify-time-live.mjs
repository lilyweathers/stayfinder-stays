// Run after database/022_booking_time.sql, from backend:
// node --import tsx scripts/verify-time-live.mjs
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
  const { bookingToday } = await import('../src/lib/booking-date.ts');
  const today = bookingToday();
  function date(offset) { const value = new Date(today + 'T12:00:00Z'); value.setUTCDate(value.getUTCDate() + offset); return value.toISOString().slice(0, 10); }
  const fixture = { title: 'VG5 disposable ' + Date.now(), description: 'Time verification', location: 'VG5 test', price_per_night: 100, max_guests: 2 };
  const property = check('create time property', await api(actors.host, '/properties', 'POST', fixture), 201).property_id;
  const body = { property_id: property, guest_name: 'VG5 guest', guest_email: actors.guest.email, guests: 1, check_in: date(-1), check_out: today };
  check('past API creation denied', await api(actors.guest, '/bookings', 'POST', body), 400);
  const denied = check('direct past creation denied', await direct(actors.guest, 'POST', { ...body, guest_id: actors.guest.id }), 400);
  assert.equal(denied.code, '23514'); assert.equal(denied.message, 'Check-in cannot be in the past');
  const sameDay = { ...body, check_in: today, check_out: date(1) };
  const row = check('same-day API creation allowed', await api(actors.guest, '/bookings', 'POST', sameDay), 201);
  const path = '/bookings/' + row.booking_id, query = '?booking_id=eq.' + row.booking_id;
  check('same-day owner confirmation allowed', await api(actors.host, path + '/confirm', 'POST'), 200);
  assert.equal(check('same-day edit preserves confirmed', await api(actors.guest, path, 'PUT', sameDay), 200).status, 'confirmed');
  check('same-day guest cancellation allowed', await api(actors.guest, path + '/cancel', 'POST'), 200);
  const rawToday = check('same-day direct creation allowed', await direct(actors.guest, 'POST', { ...sameDay, guest_id: actors.guest.id }), 201)[0];
  const cancelled = check('same-day direct cancellation allowed', await direct(actors.host, 'PATCH', { status: 'cancelled' }, '?booking_id=eq.' + rawToday.booking_id), 200);
  assert.equal(cancelled[0].status, 'cancelled');
  const future = { ...body, check_in: date(3), check_out: date(4) };
  const futureRow = check('future API creation allowed', await api(actors.guest, '/bookings', 'POST', future), 201);
  const futurePath = '/bookings/' + futureRow.booking_id, futureQuery = '?booking_id=eq.' + futureRow.booking_id;
  for (const role of ['guest', 'host']) {
    check(role + ' API cannot move check-in into past', await api(actors[role], futurePath, 'PUT', { ...future, check_in: date(-1) }), 400);
    const data = check(role + ' database cannot move check-in into past', await direct(actors[role], 'PATCH', { check_in: date(-1) }, futureQuery), 400);
    assert.equal(data.code, '23514'); assert.equal(data.message, 'Check-in cannot be in the past');
  }
  assert.equal(check('failed writes preserve future date', await api(actors.guest, futurePath), 200).check_in, future.check_in);
  const rawFuture = check('future direct creation allowed', await direct(actors.guest, 'POST', { ...future, guest_id: actors.guest.id, check_in: date(6), check_out: date(7) }), 201)[0];
  assert.equal(rawFuture.check_in, date(6));
  for (const [instant, expected] of [
    ['2027-01-01T22:59:59Z', '2027-01-01'], ['2027-01-01T23:00:00Z', '2027-01-02'],
    ['2027-07-01T21:59:59Z', '2027-07-01'], ['2027-07-01T22:00:00Z', '2027-07-02'],
    ['2027-03-28T00:59:59Z', '2027-03-28'], ['2027-03-28T01:00:00Z', '2027-03-28'],
    ['2027-10-31T00:59:59Z', '2027-10-31'], ['2027-10-31T01:00:00Z', '2027-10-31'],
  ]) {
    const response = await fetch(env.supabaseUrl + '/rest/v1/rpc/booking_calendar_date', { method: 'POST', signal: AbortSignal.timeout(20000),
      headers: { apikey: env.supabaseKey, Authorization: 'Bearer ' + actors.guest.token, 'Content-Type': 'application/json' }, body: JSON.stringify({ at_time: instant }) });
    const actual = check('hosted Stockholm boundary ' + instant, { status: response.status, data: await response.json() }, 200);
    assert.equal(actual, expected); assert.equal(bookingToday(new Date(instant)), expected);
  }
  assert.equal(bookingToday(), today, 'Date changed during runner; rerun after Stockholm midnight');
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
