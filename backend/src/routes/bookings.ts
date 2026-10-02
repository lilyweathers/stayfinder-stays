import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import { bookingValidator } from "../validators/bookingValidator.js";

const bookingApp = new Hono({ strict: false });

bookingApp.get("/", async (c) => {
  try {
    const { data, error } = await supabase.from("bookings").select("*");
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    console.error("Failed to read bookings", error);
    return c.json([], 500);
  }
});

bookingApp.get("/:id", async (c) => {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("booking_id", c.req.param("id"))
      .maybeSingle();
    if (error) throw error;
    if (!data) return c.json({ error: "Booking not found" }, 404);
    return c.json(data);
  } catch (error) {
    console.error("Failed to read booking", error);
    return c.json({ error: "Failed to read booking" }, 500);
  }
});

bookingApp.post("/", bookingValidator, async (c) => {
  try {
    const bookingBody: NewBooking = c.req.valid("json");
    const { data, error } = await supabase
      .from("bookings")
      .insert({ ...bookingBody, status: bookingBody.status ?? "pending" })
      .select("*")
      .single();
    if (error?.code === "23505") {
      return c.json({ error: "Booking ID already exists" }, 409);
    }
    if (error) throw error;
    return c.json(data, 201);
  } catch (error) {
    console.error("Failed to create booking", error);
    return c.json({ error: "Failed to create booking" }, 500);
  }
});

bookingApp.put("/:id", bookingValidator, async (c) => {
  try {
    const id = c.req.param("id");
    const bookingBody: NewBooking = c.req.valid("json");
    const { data, error } = await supabase
      .from("bookings")
      .update({ ...bookingBody, booking_id: id, status: bookingBody.status ?? "pending" })
      .eq("booking_id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) return c.json({ error: "Booking not found" }, 404);
    return c.json(data);
  } catch (error) {
    console.error("Failed to update booking", error);
    return c.json({ error: "Failed to update booking" }, 500);
  }
});

bookingApp.delete("/:id", async (c) => {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .delete()
      .eq("booking_id", c.req.param("id"))
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) return c.json({ error: "Booking not found" }, 404);
    return c.json(data);
  } catch (error) {
    console.error("Failed to delete booking", error);
    return c.json({ error: "Failed to delete booking" }, 500);
  }
});

export default bookingApp;
