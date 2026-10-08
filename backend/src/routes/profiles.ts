import { Hono } from "hono";

const profilesApp = new Hono({ strict: false });
profilesApp.get("/:id", async (c) => {
  const { data, error } = await c.get("supabase").rpc("get_public_profile", { p_user_id: c.req.param("id") });
  if (error) {
    console.error("Failed to read public profile", error);
    return c.json({ error: "Could not load this profile" }, 503);
  }
  if (!data) return c.json({ error: "Profile not found" }, 404);
  return c.json({ name: data.name, avatar_url: data.avatar_url, bio: data.bio });
});
export default profilesApp;
