import { Hono } from "hono";
import authValidator from "../validators/authValidator.js";
import { requireAuth } from "../middleware/auth.js";
import { createClient } from "@supabase/supabase-js";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { env } from "../env.js";

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

authApp.delete("/account", requireAuth,
  zValidator("json", z.object({ password: z.string().min(1).max(1024) }).strict()), async (c) => {
    const user = c.get("user")!;
    if (!user.email) return c.json({ error: "Password confirmation requires an email account" }, 400);
    if (!env.supabaseAdminKey) return c.json({ error: "Account deletion is not configured. Contact the administrator." }, 503);
    const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
    // Fresh client: password verification must not change the browser's session.
    const verifier = createClient(env.supabaseUrl, env.supabaseKey, options);
    const { data, error } = await verifier.auth.signInWithPassword({
      email: user.email, password: c.req.valid("json").password,
    });
    if (error || data.user?.id !== user.id) {
      return c.json({ error: "Password confirmation failed. Check your password and try again." }, 400);
    }
    // A dedicated admin client is used only here; ordinary requests still use RLS.
    const admin = createClient(env.supabaseUrl, env.supabaseAdminKey, options);
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      await verifier.auth.signOut({ scope: "local" });
      return c.json({ error: "Could not delete your account. Please try again or contact the administrator." }, 500);
    }
    // Clear SSR cookies even though deletion has already invalidated the account.
    await c.get("supabase").auth.signOut({ scope: "local" });
    return c.json({ message: "Your account has been deleted" });
  });

authApp.post("/logout", requireAuth, async (c) => {
  const { error } = await c.get("supabase").auth.signOut();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ message: "Logged out" });
});
