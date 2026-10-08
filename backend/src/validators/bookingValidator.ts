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
}).strict().superRefine((booking, context) => {
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm",
    year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
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
