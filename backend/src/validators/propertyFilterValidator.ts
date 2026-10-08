import { zValidator } from "@hono/zod-validator";
import * as z from "zod";

const optionalFilter = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const filterSchema = z.object({
  location: z.preprocess(optionalFilter, z.string().trim().max(100, "Location must be at most 100 characters").optional()),
  max_price: z.preprocess(optionalFilter, z.string().trim()
    .regex(/^(?:\d+(?:\.\d*)?|\.\d+)$/, "Maximum price must be a non-negative number")
    .transform(Number).pipe(z.number().finite().nonnegative()).optional()),
  guests: z.preprocess(optionalFilter, z.string().trim()
    .regex(/^\d+$/, "Guest count must be a positive whole number")
    .transform(Number).pipe(z.number().int().positive("Guest count must be at least 1")
      .max(Number.MAX_SAFE_INTEGER)).optional()),
});

export const propertyFilterValidator = zValidator("query", filterSchema, (result, c) => {
  if (!result.success) return c.json({ errors: result.error.issues }, 400);
});
