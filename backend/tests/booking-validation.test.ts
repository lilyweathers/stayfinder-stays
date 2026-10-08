import assert from "node:assert/strict";
import { test } from "node:test";
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_KEY = "test-key";
const { default: app } = await import("../src/app.js");
const { bookingSchema } = await import("../src/validators/bookingValidator.js");
const user = { id: "validation-guest", email: "guest@example.com", aud: "authenticated" };
const token = ["header", Buffer.from(JSON.stringify({ exp: 4102444800, sub: user.id })).toString("base64url"), "signature"].join(".");
const cookie = "sb-test-auth-token=base64-" + Buffer.from(JSON.stringify({ access_token: token, refresh_token: "refresh", expires_at: 4102444800, token_type: "bearer", user })).toString("base64url");
const valid = { property_id: "p1", guest_name: "Guest", guest_email: user.email,
  check_in: "2028-02-29", check_out: "2028-03-01", guests: 1 };

test("booking schema accepts leap dates and trims names/email", () => {
  const result = bookingSchema.parse({ ...valid, guest_name: " Guest ", guest_email: " guest@example.com " });
  assert.equal(result.guest_name, "Guest");
  assert.equal(result.guest_email, user.email);
  assert.equal(result.check_in, "2028-02-29");
});

test("invalid booking dates and fields return clear 400 errors on create and update without database writes", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: unknown) => {
    assert.equal(new URL(String(input)).pathname, "/auth/v1/user", "Invalid input must not reach the database");
    return Response.json(user);
  });
  const cases: [Record<string, unknown>, string, RegExp][] = [
    [{ check_in: "2000-01-01", check_out: "2000-01-02" }, "check_in", /cannot be in the past/],
    [{ check_in: "2027-02-29" }, "check_in", /real date/],
    [{ check_in: "2028-02-30" }, "check_in", /real date/],
    [{ check_out: "2028-04-31" }, "check_out", /real date/],
    [{ check_in: "2028-13-01" }, "check_in", /real date/],
    [{ check_in: "2028-00-01" }, "check_in", /real date/],
    [{ check_in: "0000-01-01" }, "check_in", /real date/],
    [{ check_in: "2028-2-29" }, "check_in", /YYYY-MM-DD/],
    [{ check_out: "2028-03-01T00:00:00Z" }, "check_out", /YYYY-MM-DD/],
    [{ check_in: "" }, "check_in", /required/],
    [{ check_out: "2028-02-29" }, "check_out", /after check-in/],
    [{ check_out: "2028-02-28" }, "check_out", /after check-in/],
    [{ guest_name: "   " }, "guest_name", /required/],
    [{ guest_email: "not-an-email" }, "guest_email", /valid guest email/],
    [{ guests: 0 }, "guests", /at least 1/],
    [{ guests: 1.5 }, "guests", /whole number/],
    [{ guests: "2" }, "guests", /number/],
    [{ property_id: " " }, "property_id", /required/],
  ];
  for (const [path, method] of [["/bookings", "POST"], ["/bookings/b1", "PUT"]]) {
    for (const [change, field, message] of cases) {
      const response = await app.request(path!, { method,
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ ...valid, ...change }),
      });
      assert.equal(response.status, 400, JSON.stringify(change));
      const body = await response.json() as { errors: { path: string[]; message: string }[] };
      assert.ok(body.errors.some(error => error.path[0] === field && message.test(error.message)), JSON.stringify(body));
    }
  }
});

test("same-day check-in is allowed using the Stockholm calendar date", () => {
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const tomorrow = new Date(today + "T12:00:00Z");
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  assert.equal(bookingSchema.safeParse({ ...valid, check_in: today, check_out: tomorrow.toISOString().slice(0, 10) }).success, true);
});
