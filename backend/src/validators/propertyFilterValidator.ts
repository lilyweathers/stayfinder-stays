import { zValidator } from "@hono/zod-validator";
import * as z from "zod";
import { bookingToday } from "../lib/booking-date.js";

const optionalFilter = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const filterSchema = z.object({
  check_in: z.preprocess(optionalFilter, z.string().trim().optional()),
  check_out: z.preprocess(optionalFilter, z.string().trim().optional()),
  sort: z.preprocess(optionalFilter, z.enum(["asc", "desc"], { error: "Price sort must be asc or desc" }).optional()),
  location: z.preprocess(optionalFilter, z.string().trim().max(100, "Location must be at most 100 characters").optional()),
  max_price: z.preprocess(optionalFilter, z.string().trim()
    .regex(/^(?:\d+(?:\.\d*)?|\.\d+)$/, "Maximum price must be a non-negative number")
    .transform(Number).pipe(z.number().finite().nonnegative()).optional()),
  guests: z.preprocess(optionalFilter, z.string().trim()
    .regex(/^\d+$/, "Guest count must be a positive whole number")
    .transform(Number).pipe(z.number().int().positive("Guest count must be at least 1")
      .max(Number.MAX_SAFE_INTEGER)).optional()),
}).superRefine((filters, context) => {
  if (!filters.check_in && !filters.check_out) return;
  for (const field of ["check_in", "check_out"] as const) {
    const value = filters[field];
    if (!value) { context.addIssue({ code: "custom", path: [field], message: "Provide both check-in and check-out dates" }); continue; }
    const date = new Date(value + "T00:00:00Z");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000") || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value)
      context.addIssue({ code: "custom", path: [field], message: "Enter a real date in YYYY-MM-DD format" });
  }
  if (filters.check_in && filters.check_in < bookingToday()) context.addIssue({ code: "custom", path: ["check_in"], message: "Check-in cannot be in the past" });
  if (filters.check_in && filters.check_out && filters.check_out <= filters.check_in)
    context.addIssue({ code: "custom", path: ["check_out"], message: "Check-out must be after check-in" });
});

export const propertyFilterValidator = zValidator("query", filterSchema, (result, c) => {
  if (!result.success) return c.json({ errors: result.error.issues }, 400);
});
