import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { bookingValidator } from "../validators/bookingValidator.js";

const bookingApp = new Hono({ strict: false });
bookingApp.use("*", requireAuth);

bookingApp.get("/", async (c) => {
  const supabase = c.get("supabase");
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
  const supabase = c.get("supabase");
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
  const supabase = c.get("supabase");
  try {
    const bookingBody: NewBooking = c.req.valid("json");
    const { data, error } = await supabase
      .from("bookings")
      .insert({ ...bookingBody, guest_id: c.get("user")!.id, status: bookingBody.status ?? "pending" })
      .select("*")
      .single();
    if (error?.code === "23505") {
      return c.json({ error: "Booking ID already exists" }, 409);
    }
    if (error?.code === "42501") return c.json({ error: "Booking access denied" }, 403);
    if (error) throw error;
    return c.json(data, 201);
  } catch (error) {
    console.error("Failed to create booking", error);
    return c.json({ error: "Failed to create booking" }, 500);
  }
});

bookingApp.put("/:id", bookingValidator, async (c) => {
  const supabase = c.get("supabase");
  try {
    const id = c.req.param("id");
    const bookingBody: NewBooking = c.req.valid("json");
    const { data, error } = await supabase
      .from("bookings")
      .update({ ...bookingBody, booking_id: id, status: bookingBody.status ?? "pending" })
      .eq("booking_id", id)
      .select("*")
      .maybeSingle();
    if (error?.code === "42501") return c.json({ error: "Booking access denied" }, 403);
    if (error) throw error;
    if (!data) return c.json({ error: "Booking not found" }, 404);
    return c.json(data);
  } catch (error) {
    console.error("Failed to update booking", error);
    return c.json({ error: "Failed to update booking" }, 500);
  }
});

bookingApp.post("/:id/cancel", async (c) => {
  const supabase = c.get("supabase");
  const id = c.req.param("id");
  const userId = c.get("user")!.id;
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  try {
    const { data: booking, error: readError } = await supabase.from("bookings")
      .select("*").eq("booking_id", id).maybeSingle();
    if (readError) throw readError;
    if (!booking) return c.json({ error: "Booking not found" }, 404);
    if (booking.guest_id !== userId) {
      const { data: property, error: propertyError } = await supabase.from("properties")
        .select("owner_id").eq("property_id", booking.property_id).maybeSingle();
      if (propertyError) throw propertyError;
      if (property?.owner_id !== userId) return c.json({ error: "Booking access denied" }, 403);
    }
    if (!["pending", "confirmed"].includes(booking.status)) {
      return c.json({ error: "Only pending or confirmed bookings can be cancelled" }, 409);
    }
    const checkIn = new Date(`${booking.check_in}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(booking.check_in) || Number.isNaN(checkIn.getTime())
      || checkIn.toISOString().slice(0, 10) !== booking.check_in || booking.check_in < today) {
      return c.json({ error: "Bookings with past or invalid check-in dates cannot be cancelled" }, 409);
    }
    // Conditional update also guards a status/date change between read and write.
    const { data, error } = await supabase.from("bookings")
      .update({ status: "cancelled" }).eq("booking_id", id)
      .in("status", ["pending", "confirmed"]).gte("check_in", today)
      .select("*").maybeSingle();
    if (error?.code === "42501") return c.json({ error: "Booking access denied" }, 403);
    if (error?.code === "23514") return c.json({ error: "This booking can no longer be cancelled" }, 409);
    if (error) throw error;
    if (!data) return c.json({ error: "Booking changed or is no longer available. Refresh and try again." }, 409);
    return c.json(data);
  } catch (error) {
    console.error("Failed to cancel booking", error);
    return c.json({ error: "Failed to cancel booking" }, 500);
  }
});

bookingApp.delete("/:id", async (c) => {
  const supabase = c.get("supabase");
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
