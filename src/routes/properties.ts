import { Hono } from "hono";
import {
  partialPropertyValidator,
  propertyValidator,
} from "../validators/propertyValidator.js";
import { supabase } from "../lib/supabase.js";

const propertiesApp = new Hono({ strict: false });

propertiesApp.get("/", async (c) => {
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

propertiesApp.post("/", propertyValidator, async (c) => {
  try {
    const { property_id: _propertyId, ...body } = c.req.valid("json");
    const { data, error } = await supabase
      .from("properties")
      .insert(body)
      .select("*")
      .single();
    if (error) throw error;
    return c.json(data, 201);
  } catch (error) {
    console.error("Failed to create property", error);
    return c.json({ error: "Failed to create property" }, 500);
  }
});

propertiesApp.patch("/:id", partialPropertyValidator, async (c) => {
  try {
    const id = c.req.param("id");
    const updates: Partial<Property> = c.req.valid("json");
    const { data, error } = await supabase
      .from("properties")
      .update({ ...updates, property_id: id })
      .eq("property_id", id)
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

propertiesApp.delete("/:id", async (c) => {
  try {
    const { data, error } = await supabase
      .from("properties")
      .delete()
      .eq("property_id", c.req.param("id"))
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
