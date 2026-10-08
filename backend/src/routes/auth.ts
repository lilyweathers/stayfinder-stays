import { bodyLimit } from "hono/body-limit";
import { randomUUID } from "node:crypto";
import { avatarBucket, photoSchema, decodePhoto, storePhoto, removeAccountPhotos } from "../lib/profile-photo.js";
import { Hono } from "hono";
import authValidator, { credentialsSchema } from "../validators/authValidator.js";
import { requireAuth } from "../middleware/auth.js";
import { createClient } from "@supabase/supabase-js";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Database } from "../types/database.js";
import { env } from "../env.js";

export const authApp = new Hono({ strict: false });
const photoBodyLimit = bodyLimit({ maxSize: 8 * 1024 * 1024, onError: c => c.json({ error: "Photo must be no larger than 5 MB" }, 413) });

const displayNameSchema = z.string().trim().min(1, "Enter your name").max(100, "Name must be at most 100 characters");
const registerValidator = zValidator("json", credentialsSchema.extend({ name: displayNameSchema.optional(), photo: photoSchema.optional() }).strict(), (result, c) => {
  if (!result.success) return c.json({ errors: result.error.issues }, 400);
});

authApp.post("/register", photoBodyLimit, registerValidator, async (c) => {
  const { email, password, name, photo } = c.req.valid("json");
  // Confirmation-required signups have no user session yet. Only this upload
  // uses the backend admin client, with an unpredictable server-generated path.
  let uploaded: { path: string; url: string } | undefined;
  let uploadClient;
  if (photo) {
    const bytes = decodePhoto(photo);
    if (!env.supabaseAdminKey) return c.json({ error: "Registration photo uploads are not configured. Please register without a photo or contact the administrator." }, 503);
    uploadClient = createClient<Database>(env.supabaseUrl, env.supabaseAdminKey, { auth: { persistSession: false, autoRefreshToken: false } });
    uploaded = await storePhoto(uploadClient, `registration/${randomUUID()}`, photo, bytes);
  }
  const metadata = { ...(name ? { display_name: name } : {}), ...(uploaded ? { avatar_url: uploaded.url } : {}) };
  const { data, error } = await c.get("supabase").auth.signUp({ email, password, ...(Object.keys(metadata).length ? { options: { data: metadata } } : {}) });
  // Supabase can mask an existing confirmed account with an empty identities list.
  if (uploaded && uploadClient && (error || !data.user || data.user.identities?.length === 0)) {
    await uploadClient.storage.from(avatarBucket).remove([uploaded.path]);
  }
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ user: data.user, confirmationRequired: !data.session }, 201);
});

authApp.post("/login", authValidator, async (c) => {
  const { data, error } = await c.get("supabase").auth.signInWithPassword(c.req.valid("json"));
  if (error) return c.json({ error: "Invalid credentials" }, 400);
  return c.json({ user: data.user });
});

authApp.get("/me", requireAuth, (c) => c.json({ user: c.get("user") }));

authApp.patch("/profile", requireAuth, photoBodyLimit,
  zValidator("json", z.object({ name: displayNameSchema, photo: photoSchema.optional(), remove_photo: z.boolean().optional() }).strict()
    .refine(value => !(value.photo && value.remove_photo), "Choose a new photo or remove the current photo"), (result, c) => {
    if (!result.success) return c.json({ errors: result.error.issues }, 400);
  }), async (c) => {
    const body = c.req.valid("json");
    const client = c.get("supabase");
    const uploaded = body.photo ? await storePhoto(client, c.get("user")!.id, body.photo, decodePhoto(body.photo)) : undefined;
    const metadata = { display_name: body.name, ...(uploaded ? { avatar_url: uploaded.url } : body.remove_photo ? { avatar_url: null } : {}) };
    const { data, error } = await client.auth.updateUser({ data: metadata });
    if (error || !data.user) {
      if (uploaded) await client.storage.from(avatarBucket).remove([uploaded.path]);
      return c.json({ error: "Could not update your profile. Please try again." }, 400);
    }
    // Never delete an arbitrary URL supplied through editable account metadata.
    const oldUrl = c.get("user")!.user_metadata.avatar_url;
    const prefix = client.storage.from(avatarBucket).getPublicUrl(c.get("user")!.id + "/").data.publicUrl;
    if ((uploaded || body.remove_photo) && typeof oldUrl === "string" && oldUrl.startsWith(prefix)) {
      const filename = oldUrl.slice(prefix.length);
      if (/^[a-f0-9-]+\.(jpg|png|webp)$/.test(filename)) await client.storage.from(avatarBucket).remove([c.get("user")!.id + "/" + filename]);
    }
    return c.json({ user: data.user });
  });

authApp.delete("/account", requireAuth,
  zValidator("json", z.object({ password: z.string().min(1).max(1024) }).strict()), async (c) => {
    const user = c.get("user")!;
    if (!user.email) return c.json({ error: "Password confirmation requires an email account" }, 400);
    if (!env.supabaseAdminKey) return c.json({ error: "Account deletion is not configured. Contact the administrator." }, 503);
    const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
    // Fresh client: password verification must not change the browser's session.
    const verifier = createClient<Database>(env.supabaseUrl, env.supabaseKey, options);
    const { data, error } = await verifier.auth.signInWithPassword({
      email: user.email, password: c.req.valid("json").password,
    });
    if (error || data.user?.id !== user.id) {
      return c.json({ error: "Password confirmation failed. Check your password and try again." }, 400);
    }
    // A dedicated admin client is used only here; ordinary requests still use RLS.
    const admin = createClient<Database>(env.supabaseUrl, env.supabaseAdminKey, options);
    await removeAccountPhotos(admin, user.id);
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
