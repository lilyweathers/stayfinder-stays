import assert from "node:assert/strict";
import { test } from "node:test";

process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_KEY = "test-key";
const { default: app } = await import("../src/app.js");
const user = { id: "overlap-guest", email: "guest@example.com", aud: "authenticated" };
const token = ["header", Buffer.from(JSON.stringify({ exp: 4102444800, sub: user.id })).toString("base64url"), "signature"].join(".");
const session = { access_token: token, refresh_token: "refresh", expires_at: 4102444800, expires_in: 3600, token_type: "bearer", user };
const cookie = "sb-test-auth-token=base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
const body = { property_id: "p1", guest_name: "Guest", guest_email: user.email, check_in: "2099-01-01", check_out: "2099-01-03", guests: 1 };

test("create and update report database exclusion conflicts without exposing another guest's booking", async (t) => {
  // Vg2: Simulera överlappningsfelet vid skapande och redigering.
  // Kontrollera att svaret blir 409 och inte innehåller privata databasdetaljer.
  const writes: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: unknown, init: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname === "/auth/v1/user") return Response.json(user);
    if (url.pathname === "/rest/v1/properties") return Response.json([{ max_guests: 2, price_per_night: 100 }]);
    assert.equal(url.pathname, "/rest/v1/bookings");
    assert.equal(new Headers(init.headers).get("Authorization"), "Bearer " + token);
    // Only the target booking is read; overlap remains a database check.
    if (init.method === "GET") return Response.json([{ ...body, booking_id: "b1", guest_id: user.id, nightly_price: 100, total_price: 200, status: "pending" }]);
    assert.ok(init.method === "POST" || init.method === "PATCH");
    writes.push(init.method!);
    return Response.json({ code: "23P01", message: "conflicting key contains private details", details: "Other guest booking" }, { status: 409 });
  });
  for (const [path, method] of [["/bookings", "POST"], ["/bookings/b1", "PUT"]]) {
    const response = await app.request(path!, { method, headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { error: "This property is already booked for the selected dates. Choose different dates." });
  }
  assert.deepEqual(writes, ["POST", "PATCH"]);
});
