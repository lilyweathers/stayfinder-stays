import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

export default zValidator("json", z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
}), (result, c) => {
  if (!result.success) return c.json({ errors: result.error.issues }, 400);
});
