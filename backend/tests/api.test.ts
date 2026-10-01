import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_KEY = "test-key";

const sourceDataDirectory = path.resolve(process.cwd(), "src", "data");

const { default: app } = await import("../src/app.js");

test("root identifies the API", async () => {
  const response = await app.request("/");
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "StayFinder API");
});

test("properties can be listed and fetched by id", async (t) => {
  const fixtures = JSON.parse(await fs.readFile(
    path.join(sourceDataDirectory, "properties.json"), "utf8",
  )) as Property[];
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = new URL(String(input));
    assert.equal(url.pathname, "/rest/v1/properties");
    const id = url.searchParams.get("property_id");
    return Response.json(id ? fixtures.filter((item) => `eq.${item.property_id}` === id) : fixtures);
  });
  const listResponse = await app.request("/properties");
  assert.equal(listResponse.status, 200);
  const properties = (await listResponse.json()) as Property[];
  assert.equal(properties.length, fixtures.length);

  const itemResponse = await app.request("/properties/property_1001");
  assert.equal(itemResponse.status, 200);
});

test("booking CRUD uses Supabase", async (t) => {
  const body = {
    property_id: "property_1001",
    guest_name: "Test Guest",
    guest_email: "guest@example.com",
    check_in: "2026-10-10",
    check_out: "2026-10-12",
    guests: 2,
  };
  let stored: Booking | undefined;
  const methods: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init: RequestInit) => {
    const url = new URL(String(input));
    assert.equal(url.pathname, "/rest/v1/bookings");
    methods.push(init.method!);
    if (init.method === "POST") {
      const payload = JSON.parse(String(init.body));
      assert.deepEqual(payload, { ...body, status: "pending" });
      stored = { ...payload, booking_id: "generated-booking-id", status: "pending" };
      return Response.json(stored);
    }
    const filter = url.searchParams.get("booking_id");
    if (filter) assert.equal(filter, "eq.generated-booking-id");
    if (init.method === "PATCH") {
      assert.ok(filter);
      const payload = JSON.parse(String(init.body));
      assert.equal(payload.booking_id, "generated-booking-id");
      stored = payload;
    }
    const result = stored ? [stored] : [];
    if (init.method === "DELETE") {
      assert.ok(filter);
      stored = undefined;
    }
    return Response.json(result);
  });
  const createResponse = await app.request("/bookings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.equal(createResponse.status, 201);
  const created = (await createResponse.json()) as Booking;
  assert.equal(created.booking_id, "generated-booking-id");
  assert.equal(created.status, "pending");

  const listResponse = await app.request("/bookings");
  assert.equal(listResponse.status, 200);
  assert.deepEqual(await listResponse.json(), [created]);
  const itemResponse = await app.request(`/bookings/${created.booking_id}`);
  assert.equal(itemResponse.status, 200);
  assert.deepEqual(await itemResponse.json(), created);

  const updateResponse = await app.request(`/bookings/${created.booking_id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...body,
      booking_id: "attempted-id-change",
      status: "confirmed",
    }),
  });
  assert.equal(updateResponse.status, 200);
  const updated = (await updateResponse.json()) as Booking;
  assert.equal(updated.booking_id, created.booking_id);
  assert.equal(updated.status, "confirmed");

  const deleteResponse = await app.request(`/bookings/${created.booking_id}`, {
    method: "DELETE",
  });
  assert.equal(deleteResponse.status, 200);

  const missingResponse = await app.request(`/bookings/${created.booking_id}`);
  assert.equal(missingResponse.status, 404);
  assert.deepEqual(methods, ["POST", "GET", "GET", "PATCH", "DELETE", "GET"]);
});

test("invalid booking input returns validation details", async () => {
  const response = await app.request("/bookings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ guest_email: "not-an-email" }),
  });
  assert.equal(response.status, 400);
  const result = (await response.json()) as { errors: unknown[] };
  assert.ok(result.errors.length > 0);
});

test("property writes use Supabase and preserve the route ID", async (t) => {
  const body = {
    title: "Test apartment", description: "A bright apartment", location: "Stockholm",
    price_per_night: 850, max_guests: 2,
  };
  const property = { ...body, property_id: "generated-id" };
  const expectedMethods = ["POST", "PATCH", "DELETE"];
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init: RequestInit) => {
    const url = new URL(String(input));
    const method = expectedMethods.shift();
    assert.equal(init.method, method);
    assert.equal(url.pathname, "/rest/v1/properties");
    assert.equal(url.searchParams.get("select"), "*");
    if (method === "POST") {
      assert.deepEqual(JSON.parse(String(init.body)), body);
    } else {
      assert.equal(url.searchParams.get("property_id"), "eq.generated-id");
      if (method === "PATCH") {
        assert.deepEqual(JSON.parse(String(init.body)), { title: "Updated apartment", property_id: "generated-id" });
      }
    }
    return Response.json(method === "POST" ? property : [property]);
  });
  const created = await app.request("/properties", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...body, property_id: "ignored-id" }),
  });
  assert.equal(created.status, 201);
  assert.deepEqual(await created.json(), property);
  const updated = await app.request("/properties/generated-id", {
    method: "PATCH", headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Updated apartment", property_id: "attempted-id-change" }),
  });
  assert.equal(updated.status, 200);
  assert.deepEqual(await updated.json(), property);
  const deleted = await app.request("/properties/generated-id", { method: "DELETE" });
  assert.equal(deleted.status, 200);
  assert.deepEqual(await deleted.json(), property);
  assert.deepEqual(expectedMethods, []);
});

test("missing properties return 404 and database errors return 500", async (t) => {
  let fail = false;
  t.mock.method(globalThis, "fetch", async () => fail
    ? Response.json({ message: "Database unavailable", code: "XX000" }, { status: 400 })
    : Response.json([]));
  t.mock.method(console, "error", () => {});
  for (const method of ["GET", "PATCH", "DELETE"]) {
    const options = method === "PATCH"
      ? { method, headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Updated title" }) }
      : { method };
    const missing = await app.request("/properties/missing-id", options);
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { error: "Property not found" });
    fail = true;
    const failed = await app.request("/properties/missing-id", options);
    assert.equal(failed.status, 500);
    fail = false;
  }
});

test("booking routes handle missing rows, database failures, and duplicate IDs", async (t) => {
  const body = {
    property_id: "property_1001", guest_name: "Test Guest",
    guest_email: "guest@example.com", check_in: "2026-10-10",
    check_out: "2026-10-12", guests: 2,
  };
  let errorCode: string | undefined;
  t.mock.method(globalThis, "fetch", async () => errorCode
    ? Response.json({ code: errorCode, message: "Database error" }, { status: 400 })
    : Response.json([]));
  t.mock.method(console, "error", () => {});
  for (const method of ["GET", "PUT", "DELETE"]) {
    const options = method === "PUT"
      ? { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
      : { method };
    const missing = await app.request("/bookings/missing-id", options);
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { error: "Booking not found" });
    errorCode = "XX000";
    const failed = await app.request("/bookings/missing-id", options);
    assert.equal(failed.status, 500);
    errorCode = undefined;
  }
  errorCode = "XX000";
  assert.equal((await app.request("/bookings")).status, 500);
  const options = {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...body, booking_id: "duplicate-id" }),
  };
  assert.equal((await app.request("/bookings", options)).status, 500);
  errorCode = "23505";
  const duplicate = await app.request("/bookings", options);
  assert.equal(duplicate.status, 409);
  assert.deepEqual(await duplicate.json(), { error: "Booking ID already exists" });
});
