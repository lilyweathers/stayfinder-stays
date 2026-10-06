import { Hono } from "hono";
import authValidator from "../validators/authValidator.js";
import { requireAuth } from "../middleware/auth.js";

export const authApp = new Hono({ strict: false });

authApp.post("/register", authValidator, async (c) => {
  const { data, error } = await c.get("supabase").auth.signUp(c.req.valid("json"));
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ user: data.user, confirmationRequired: !data.session }, 201);
});

authApp.post("/login", authValidator, async (c) => {
  const { data, error } = await c.get("supabase").auth.signInWithPassword(c.req.valid("json"));
  if (error) return c.json({ error: "Invalid credentials" }, 400);
  return c.json({ user: data.user });
});

authApp.get("/me", requireAuth, (c) => c.json({ user: c.get("user") }));

authApp.post("/logout", requireAuth, async (c) => {
  const { error } = await c.get("supabase").auth.signOut();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ message: "Logged out" });
});
