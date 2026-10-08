import assert from "node:assert/strict";
import { test } from "node:test";
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_KEY = "test-key";
const { default: app } = await import("../src/app.js");

test("public property filters combine in the database query with inclusive limits", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = new URL(String(input));
    assert.equal(url.pathname, "/rest/v1/properties");
    assert.equal(url.searchParams.get("deleted_at"), "is.null");
    assert.equal(url.searchParams.get("location"), "ilike.%gOtHeNbUrG%");
    assert.equal(url.searchParams.get("price_per_night"), "lte.1200");
    assert.equal(url.searchParams.get("max_guests"), "gte.4");
    return Response.json([{ property_id: "matching-property" }]);
  });
  const response = await app.request("/properties?location=%20gOtHeNbUrG%20&max_price=1200&guests=4");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), [{ property_id: "matching-property" }]);
});

test("each filter works independently, blank filters are ignored, and zero price is applied", async (t) => {
  let expected: Record<string, string> = {};
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = new URL(String(input));
    for (const field of ["location", "price_per_night", "max_guests"]) {
      assert.equal(url.searchParams.get(field), expected[field] ?? null);
    }
    return Response.json([]);
  });
  for (const [query, filters] of [
    ["location=Stockholm", { location: "ilike.%Stockholm%" }],
    ["max_price=1200.50", { price_per_night: "lte.1200.5" }],
    ["guests=4", { max_guests: "gte.4" }],
    ["max_price=0", { price_per_night: "lte.0" }],
    ["location=%20&max_price=&guests=", {}],
  ] as [string, Record<string, string>][]) {
    expected = filters;
    const response = await app.request("/properties?" + query);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), []);
  }
});

test("invalid price and guest filters are rejected before querying Supabase", async (t) => {
  t.mock.method(globalThis, "fetch", () => { throw new Error("Invalid filters must not query the database"); });
  for (const query of ["max_price=-1", "max_price=abc", "max_price=Infinity", "max_price=0x10",
    "guests=0", "guests=-1", "guests=1.5", "guests=abc", "guests=9007199254740992",
    "location=" + "x".repeat(101)]) {
    const response = await app.request("/properties?" + query);
    assert.equal(response.status, 400, query);
    const body = await response.json() as { errors: unknown[] };
    assert.ok(body.errors.length > 0);
  }
});

test("price sorting is performed by the database and preserves combined filters", async (t) => {
  let direction = "asc";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = new URL(String(input));
    assert.equal(url.searchParams.get("order"), "price_per_night." + direction + ",property_id.asc");
    assert.equal(url.searchParams.get("location"), "ilike.%Sweden%");
    assert.equal(url.searchParams.get("price_per_night"), "lte.1200");
    assert.equal(url.searchParams.get("max_guests"), "gte.2");
    assert.equal(url.searchParams.get("deleted_at"), "is.null");
    const rows = direction === "asc"
      ? [{ price_per_night: 850 }, { price_per_night: 1200 }]
      : [{ price_per_night: 1200 }, { price_per_night: 850 }];
    return Response.json(rows);
  });
  for (direction of ["asc", "desc"]) {
    const response = await app.request("/properties?location=Sweden&max_price=1200&guests=2&sort=" + direction);
    assert.equal(response.status, 200);
    const rows = await response.json() as { price_per_night: number }[];
    assert.deepEqual(rows.map(row => row.price_per_night), direction === "asc" ? [850, 1200] : [1200, 850]);
  }
});

test("blank sorting keeps default order and invalid sorting returns 400", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    calls++;
    assert.equal(new URL(String(input)).searchParams.get("order"), null);
    return Response.json([]);
  });
  for (const query of ["", "?sort=", "?sort=%20"]) {
    assert.equal((await app.request("/properties" + query)).status, 200);
  }
  assert.equal(calls, 3);
  for (const sort of ["invalid", "ASC", "price_per_night.desc"]) {
    assert.equal((await app.request("/properties?sort=" + sort)).status, 400);
  }
  assert.equal(calls, 3, "Invalid sorting must not reach the database");
});
