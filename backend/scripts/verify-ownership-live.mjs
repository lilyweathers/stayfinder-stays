// Run from backend: node --import tsx scripts/verify-ownership-live.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { serve } from "@hono/node-server";

let credentials;
try {
  credentials = JSON.parse(await readFile(new URL("../../requests/local/ownership-accounts.json", import.meta.url), "utf8"));
} catch {
  throw new Error("Create ignored requests/local/ownership-accounts.json with host and guest { email, password } objects.");
}
for (const role of ["host", "guest"]) {
  assert.equal(typeof credentials[role]?.email, "string", `Missing ${role} email`);
  assert.equal(typeof credentials[role]?.password, "string", `Missing ${role} password`);
}
assert.notEqual(credentials.host.email, credentials.guest.email, "Use two distinct test accounts");
// Current Hono source, actual HTTP requests, configured hosted Supabase, no admin client.
const { default: app } = await import("../src/app.ts");
const { env } = await import("../src/env.ts");
const server = serve({ fetch: app.fetch, hostname: "127.0.0.1", port: 0 });
if (!server.listening) await new Promise(resolve => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const actors = { host: { cookies: new Map() }, guest: { cookies: new Map() } };
const properties = new Map();
const bookings = new Map();
let passed = 0;
let failed = false;
async function call(actor, path, method = "GET", body) {
  const response = await fetch(base + path, {
    method, signal: AbortSignal.timeout(20000),
    headers: { Origin: env.frontendUrl, "Content-Type": "application/json",
      Cookie: [...actor.cookies].map(([name, value]) => `${name}=${value}`).join("; ") },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(";")[0];
    const index = pair.indexOf("=");
    const name = pair.slice(0, index), value = pair.slice(index + 1);
    if (value) actor.cookies.set(name, value); else actor.cookies.delete(name);
  }
  return { status: response.status, data: await response.json() };
}
function check(label, result, expected) {
  assert.equal(result.status, expected, `${label}: unexpected HTTP status`);
  console.log(`PASS ${label}: HTTP ${result.status}`);
  passed++;
  return result.data;
}
const fixture = { title: `VG1 disposable ${Date.now()}`, description: "Live ownership fixture",
  location: "VG1 test", price_per_night: 100, max_guests: 2 };
async function createProperty(actor) {
  const result = await call(actor, "/properties", "POST", fixture);
  if (result.status === 201 && result.data.property_id) properties.set(result.data.property_id, actor);
  const row = check("property creation", result, 201);
  assert.equal(row.owner_id, actor.id, "Owner differs from verified /auth/me identity");
  return row;
}
function body(property, day = 1) {
  return { property_id: property.property_id, guest_name: "VG1 guest", guest_email: credentials.guest.email,
    guests: 1, check_in: `2099-01-${String(day).padStart(2, "0")}`, check_out: `2099-01-${String(day + 1).padStart(2, "0")}` };
}
async function createBooking(property, day = 1) {
  const result = await call(actors.guest, "/bookings", "POST", body(property, day));
  if (result.status === 201 && result.data.booking_id) bookings.set(result.data.booking_id, properties.get(property.property_id));
  const row = check("booking creation", result, 201);
  assert.equal(row.guest_id, actors.guest.id, "Guest differs from verified /auth/me identity");
  return row;
}
async function removeBooking(actor, id) {
  check("delete disposable booking", await call(actor, `/bookings/${id}`, "DELETE"), 200);
  bookings.delete(id);
}
try {
  for (const role of ["host", "guest"]) {
    check(`${role} login`, await call(actors[role], "/auth/login", "POST", credentials[role]), 200);
    actors[role].id = check(`${role} verified identity`, await call(actors[role], "/auth/me"), 200).user.id;
  }
  assert.notEqual(actors.host.id, actors.guest.id);
  const property = await createProperty(actors.host);
  const booking = await createBooking(property);
  const path = `/bookings/${booking.booking_id}`;
  check("spoofed owner rejected", await call(actors.host, "/properties", "POST", { ...fixture, owner_id: actors.guest.id }), 400);
  check("spoofed guest rejected", await call(actors.guest, "/bookings", "POST", { ...body(property, 3), guest_id: actors.host.id }), 400);
  check("nonowner property PATCH denied", await call(actors.guest, `/properties/${property.property_id}`, "PATCH", { title: "Unauthorized" }), 404);
  check("owner property PATCH allowed", await call(actors.host, `/properties/${property.property_id}`, "PATCH", { title: fixture.title + " updated" }), 200);
  check("guest property booking list denied", await call(actors.guest, `/bookings?property_id=${property.property_id}`), 403);
  assert.ok(check("host property booking list allowed", await call(actors.host, `/bookings?property_id=${property.property_id}`), 200).some(row => row.booking_id === booking.booking_id));
  for (const role of ["guest", "host"]) {
    const updated = check(`${role} booking edit`, await call(actors[role], path, "PUT", { ...body(property), guest_name: `Edited by ${role}` }), 200);
    assert.equal(updated.guest_id, actors.guest.id);
    assert.equal(updated.guest_name, `Edited by ${role}`);
  }
  check("booking guest transfer rejected", await call(actors.guest, path, "PUT", { ...body(property), guest_id: actors.host.id }), 400);
  check("guest confirmation denied", await call(actors.guest, path + "/confirm", "POST"), 403);
  assert.equal(check("host confirmation", await call(actors.host, path + "/confirm", "POST"), 200).status, "confirmed");
  assert.equal(check("guest cancellation", await call(actors.guest, path + "/cancel", "POST"), 200).status, "cancelled");
  await removeBooking(actors.host, booking.booking_id);
  const next = await createBooking(property, 3);
  assert.equal(check("host cancellation", await call(actors.host, `/bookings/${next.booking_id}/cancel`, "POST"), 200).status, "cancelled");
  await removeBooking(actors.host, next.booking_id);

  // Reverse ownership on a second property. The host account is now unrelated
  // to both its owner and booking guest, so only two existing accounts are needed.
  const privateProperty = await createProperty(actors.guest);
  const privateBooking = await createBooking(privateProperty);
  const privatePath = `/bookings/${privateBooking.booking_id}`;
  const before = check("participant reads private booking", await call(actors.guest, privatePath), 200);
  assert.ok(!check("spoofed list guest query ignored", await call(actors.host, `/bookings?guest_id=${actors.guest.id}`), 200).some(row => row.booking_id === privateBooking.booking_id));
  check("unrelated property booking list denied", await call(actors.host, `/bookings?property_id=${privateProperty.property_id}`), 403);
  for (const [suffix, method, payload] of [
    ["", "GET"], ["", "PUT", { ...body(privateProperty), guest_name: "Unauthorized" }],
    ["/confirm", "POST"], ["/cancel", "POST"], ["", "DELETE"],
  ]) check(`unrelated ${method} ${suffix || "booking"} denied`, await call(actors.host, privatePath + suffix, method, payload), 404);
  assert.deepEqual(check("denied mutations preserved booking", await call(actors.guest, privatePath), 200), before);
  check("booking property transfer denied", await call(actors.guest, privatePath, "PUT", body(property)), 403);
  assert.deepEqual(check("denied transfer preserved booking", await call(actors.guest, privatePath), 200), before);
  await removeBooking(actors.guest, privateBooking.booking_id);
} catch (error) {
  failed = true;
  console.error(`FAIL: ${error instanceof assert.AssertionError ? error.message : "Request/setup failed; check connection and test-account configuration."}`);
} finally {
  // Only clean IDs created during this run; bookings precede property removal.
  for (const [id, actor] of bookings) {
    const result = await call(actor, `/bookings/${id}`, "DELETE").catch(() => ({ status: 0 }));
    if (result.status === 200 || result.status === 404) bookings.delete(id);
  }
  if (!bookings.size) for (const [id, actor] of properties) {
    const result = await call(actor, `/properties/${id}`, "DELETE").catch(() => ({ status: 0 }));
    if (result.status === 200 || result.status === 404) properties.delete(id);
  }
  for (const actor of Object.values(actors)) if (actor.id) await call(actor, "/auth/logout", "POST").catch(() => {});
  await new Promise(resolve => server.close(resolve));
  if (bookings.size || properties.size) {
    failed = true;
    console.error(`Cleanup needed for disposable IDs: bookings=${[...bookings.keys()]} properties=${[...properties.keys()]}`);
  }
}
console.log(`${failed ? "FAIL" : "PASS"}: ${passed} HTTP checks; cleanup ${bookings.size || properties.size ? "incomplete" : "complete"}.`);
process.exitCode = failed ? 1 : 0;
