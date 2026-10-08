import { Hono } from "hono";
import {
  partialPropertyValidator,
  propertyValidator,
} from "../validators/propertyValidator.js";
import { requireAuth } from "../middleware/auth.js";

const propertiesApp = new Hono({ strict: false });

propertiesApp.get("/", async (c) => {
  const supabase = c.get("supabase");
  try {
    const { data, error } = await supabase.from("properties").select("*");
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    console.error("Failed to read properties", error);
    return c.json({ error: "Failed to read properties" }, 500);
  }
});

propertiesApp.get("/:id", async (c) => {
  const supabase = c.get("supabase");
  try {
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("property_id", c.req.param("id"))
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
  try {
    const propertyBody: NewProperty = c.req.valid("json");
    const { title, description, location, price_per_night, max_guests } = propertyBody;
    const { data, error } = await supabase
      .from("properties")
      .insert({ title, description, location, price_per_night, max_guests, owner_id: c.get("user")!.id })
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
    const { data, error } = await supabase
      .from("properties")
      .delete()
      .eq("property_id", c.req.param("id"))
      .eq("owner_id", c.get("user")!.id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) return c.json({ error: "Property not found" }, 404);
    return c.json(data);
  } catch (error) {
    console.error("Failed to delete property", error);
    return c.json({ error: "Failed to delete property" }, 500);
  }
});

export default propertiesApp;
