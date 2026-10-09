// Run after database/023_booking_price.sql, from backend:
// node --import tsx scripts/verify-price-live.mjs
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
  const fixture = { title: 'VG6 disposable ' + Date.now(), description: 'Price verification', location: 'VG6 test', price_per_night: 123.45, max_guests: 2 };
  const property = check('create price property', await api(actors.host, '/properties', 'POST', fixture), 201).property_id;
  const body = { property_id: property, guest_name: 'VG6 guest', guest_email: actors.guest.email, guests: 1, check_in: '2099-08-01', check_out: '2099-08-04' };
  const row = check('API ignores forged prices on create', await api(actors.guest, '/bookings', 'POST', { ...body, total_price: 1, nightly_price: 0, price_per_night: 'free' }), 201);
  assert.equal(row.nightly_price, 123.45); assert.equal(row.total_price, 370.35);
  const path = '/bookings/' + row.booking_id, query = '?booking_id=eq.' + row.booking_id;
  const raw = check('direct create ignores forged total and rate', await direct(actors.guest, 'POST', { ...body, guest_id: actors.guest.id, check_in: '2099-09-01', check_out: '2099-09-04', nightly_price: 0, total_price: 1 }), 201)[0];
  assert.equal(raw.nightly_price, 123.45); assert.equal(raw.total_price, 370.35);
  check('host changes property price', await api(actors.host, '/properties/' + property, 'PATCH', { price_per_night: 999 }), 200);
  for (const id of [row.booking_id, raw.booking_id]) {
    const saved = check('existing total survives property change', await api(actors.guest, '/bookings/' + id), 200);
    assert.equal(saved.nightly_price, 123.45); assert.equal(saved.total_price, 370.35);
  }
  const forged = check('API edit ignores arbitrary client prices', await api(actors.guest, path, 'PUT', { ...body, nightly_price: 999, total_price: { arbitrary: true }, price_per_night: null }), 200);
  assert.equal(forged.nightly_price, 123.45); assert.equal(forged.total_price, 370.35);
  for (const role of ['guest', 'host']) {
    const result = check(role + ' direct price overwrite ignored', await direct(actors[role], 'PATCH', { nightly_price: 999, total_price: 0 }, query), 200)[0];
    assert.equal(result.nightly_price, 123.45); assert.equal(result.total_price, 370.35);
  }
  const extended = check('date edit uses frozen rate', await api(actors.guest, path, 'PUT', { ...body, check_out: '2099-08-05', total_price: 0 }), 200);
  assert.equal(extended.nightly_price, 123.45); assert.equal(extended.total_price, 493.8);
  const rawExtended = check('direct date edit uses frozen rate', await direct(actors.guest, 'PATCH', { check_out: '2099-09-05', nightly_price: 999, total_price: 0 }, '?booking_id=eq.' + raw.booking_id), 200)[0];
  assert.equal(rawExtended.nightly_price, 123.45); assert.equal(rawExtended.total_price, 493.8);
  const newBody = { ...body, check_in: '2099-10-01', check_out: '2099-10-03' };
  const newer = check('new API booking uses changed database price', await api(actors.guest, '/bookings', 'POST', { ...newBody, total_price: 1 }), 201);
  assert.equal(newer.nightly_price, 999); assert.equal(newer.total_price, 1998);
  const rawNew = check('new direct booking uses changed database price', await direct(actors.guest, 'POST', { ...newBody, guest_id: actors.guest.id, check_in: '2099-11-01', check_out: '2099-11-03', total_price: 1 }), 201)[0];
  assert.equal(rawNew.nightly_price, 999); assert.equal(rawNew.total_price, 1998);
  const cancelled = check('cancellation preserves saved total', await api(actors.guest, path + '/cancel', 'POST'), 200);
  assert.equal(cancelled.nightly_price, 123.45); assert.equal(cancelled.total_price, 493.8);
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
