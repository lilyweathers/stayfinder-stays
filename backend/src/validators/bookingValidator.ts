import { bookingToday } from "../lib/booking-date.js";
import { zValidator } from "@hono/zod-validator";
import * as z from "zod";

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const date = new Date(value + "T00:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const dateField = (label: string) => z.string({ error: label + " date is required" })
  .min(1, label + " date is required")
  .refine(value => value === "" || isCalendarDate(value), label + " must be a real date in YYYY-MM-DD format");

export const bookingSchema = z.object({
  // Vg1: guest_id ingår inte i tillåtna fält. strict() avvisar försök
  // att skicka detta fält; backend hämtar identiteten från den verifierade sessionen.
  property_id: z.string({ error: "Property ID is required" }).trim().min(1, "Property ID is required"),
  guest_name: z.string({ error: "Guest name is required" }).trim().min(1, "Guest name is required"),
  guest_email: z.string({ error: "Guest email is required" }).trim().pipe(z.email("Enter a valid guest email address")),
  check_in: dateField("Check-in"),
  check_out: dateField("Check-out"),
  guests: z.number({ error: "Guest count must be a number" })
    .int("Guest count must be a whole number").positive("Guest count must be at least 1")
    .max(Number.MAX_SAFE_INTEGER, "Guest count is too large"),
  booking_id: z.string().min(1).optional(),
  status: z.enum(["pending", "confirmed", "cancelled"]).optional(),
  // Accepted solely to discard forged/client-calculated prices before writes.
  total_price: z.unknown().optional(),
  nightly_price: z.unknown().optional(),
  price_per_night: z.unknown().optional(),
// Vg6: Klientens prisfält plockas bort; backend och databasen bestämmer det sparade priset.
}).strict().transform(({ total_price: _total, nightly_price: _nightly, price_per_night: _rate, ...booking }) => booking).superRefine((booking, context) => {
  // Vg5: Validera mot dagens datum i Stockholm och kräv att utcheckning sker efter incheckning.
  const today = bookingToday();
  if (isCalendarDate(booking.check_in) && booking.check_in < today) {
    context.addIssue({ code: "custom", path: ["check_in"], message: "Check-in cannot be in the past" });
  }
  if (isCalendarDate(booking.check_in) && isCalendarDate(booking.check_out)
    && booking.check_out <= booking.check_in) {
    context.addIssue({ code: "custom", path: ["check_out"], message: "Check-out must be after check-in" });
  }
});

export const bookingValidator = zValidator("json", bookingSchema, (result, c) => {
  if (!result.success) return c.json({ errors: result.error.issues }, 400);
});
