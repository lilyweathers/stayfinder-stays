import { Hono } from "hono";
import {
  partialPropertyValidator,
  propertyValidator,
} from "../validators/propertyValidator.js";
import { propertyFilterValidator } from "../validators/propertyFilterValidator.js";
import { requireAuth } from "../middleware/auth.js";

const propertiesApp = new Hono({ strict: false });

propertiesApp.get("/", propertyFilterValidator, async (c) => {
  const supabase = c.get("supabase");
  try {
    const { location, max_price, guests, sort } = c.req.valid("query");
    let query = supabase.from("properties").select("*").is("deleted_at", null);
    if (location) {
      // Treat SQL wildcard characters in the search text literally.
      const escaped = location.replace(/[\\%_]/g, character => `\\${character}`);
      query = query.ilike("location", `%${escaped}%`);
    }
    if (max_price !== undefined) query = query.lte("price_per_night", max_price);
    if (guests !== undefined) query = query.gte("max_guests", guests);
    if (sort) {
      query = query.order("price_per_night", { ascending: sort === "asc" })
        .order("property_id", { ascending: true });
    }
    const { data, error } = await query;
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    console.error("Failed to read properties", error);
    return c.json({ error: "Failed to read properties" }, 500);
  }
});

propertiesApp.get("/:id/availability", async (c) => {
  const { data, error } = await c.get("supabase").rpc("get_property_availability", { p_property_id: c.req.param("id") });
  if (error) {
    console.error("Failed to read property availability", error);
    return c.json({ error: "Could not load available dates. Please try again." }, 503);
  }
  if (data === null) return c.json({ error: "Property not found" }, 404);
  return c.json(data);
});

propertiesApp.get("/:id/host", async (c) => {
  const { data, error } = await c.get("supabase").rpc("get_property_host", { p_property_id: c.req.param("id") });
  if (error) {
    console.error("Failed to read property host", error);
    return c.json({ error: "Could not load host information" }, 503);
  }
  if (!data) return c.json({ error: "Host information not found" }, 404);
  return c.json(data);
});

propertiesApp.get("/:id", async (c) => {
  const supabase = c.get("supabase");
  try {
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("property_id", c.req.param("id"))
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!data) return c.json({ error: "Property not found" }, 404);
    return c.json(data);
  } catch (error) {
    console.error("Failed to read property", error);
    return c.json({ error: "Failed to read property" }, 500);
  }
});

propertiesApp.post("/", requireAuth, propertyValidator, async (c) => {
  const supabase = c.get("supabase");
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const propertyBody: NewProperty = c.req.valid("json");
    const { title, description, location, price_per_night, max_guests, image_url } = propertyBody;
    const { data, error } = await supabase
      .from("properties")
      .insert({ title, description, location, price_per_night, max_guests, ...(image_url !== undefined ? { image_url } : {}), owner_id: user.id })
      .select("*")
      .single();
    if (error?.code === "42501") return c.json({ error: "Property access denied" }, 403);
    if (error) throw error;
    return c.json(data, 201);
  } catch (error) {
    console.error("Failed to create property", error);
    return c.json({ error: "Failed to create property" }, 500);
  }
});

propertiesApp.patch("/:id", requireAuth, partialPropertyValidator, async (c) => {
  const supabase = c.get("supabase");
  try {
    const id = c.req.param("id");
    const propertyBody: Partial<NewProperty> = c.req.valid("json");
    const { data, error } = await supabase
      .from("properties")
      .update({ ...propertyBody, property_id: id })
      .eq("property_id", id)
      .eq("owner_id", c.get("user")!.id)
      .select("*")
      .maybeSingle();
    if (error?.code === "42501") return c.json({ error: "Property access denied" }, 403);
    if (error) throw error;
    if (!data) return c.json({ error: "Property not found" }, 404);
    return c.json(data);
  } catch (error) {
    console.error("Failed to update property", error);
    return c.json({ error: "Failed to update property" }, 500);
  }
});

propertiesApp.put("/:id", requireAuth, propertyValidator, async (c) => {
  const supabase = c.get("supabase");
  try {
    const id = c.req.param("id");
    const propertyBody: Partial<NewProperty> = c.req.valid("json");
    const { data, error } = await supabase
      .from("properties")
      .update({ ...propertyBody, property_id: id })
      .eq("property_id", id)
      .eq("owner_id", c.get("user")!.id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) return c.json({ error: "Property not found" }, 404);
    return c.json(data);
  } catch (error) {
    console.error("Failed to update property", error);
    return c.json({ error: "Failed to update property" }, 500);
  }
});

propertiesApp.delete("/:id", requireAuth, async (c) => {
  const supabase = c.get("supabase");
  try {
    const { data, error } = await supabase.rpc("delete_property", { p_property_id: c.req.param("id")! });
    if (error?.code === "42501") return c.json({ error: "Property access denied" }, 403);
    if (error?.code === "22P02") return c.json({ error: "Invalid property ID" }, 400);
    if (error) throw error;
    if (!data?.property) return c.json({ error: "Property not found" }, 404);
    return c.json({ message: "Property deleted", ...data });
  } catch (error) {
    console.error("Failed to delete property", error);
    return c.json({ error: "Failed to delete property" }, 500);
  }
});

export default propertiesApp;
