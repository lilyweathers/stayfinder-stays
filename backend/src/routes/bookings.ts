import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { bookingValidator } from "../validators/bookingValidator.js";
import { checkBookingCapacity } from "../lib/booking-capacity.js";

const bookingApp = new Hono({ strict: false });
bookingApp.use("*", requireAuth);

bookingApp.get("/", async (c) => {
  const supabase = c.get("supabase");
  try {
    const propertyId = c.req.query("property_id");
    let query = supabase.from("bookings").select("*");
    if (propertyId) {
      const { data: property, error: ownerError } = await supabase.from("properties")
        .select("owner_id").eq("property_id", propertyId).maybeSingle();
      if (ownerError) throw ownerError;
      if (property?.owner_id !== c.get("user")!.id) {
        return c.json({ error: "Only the property owner can view all bookings for this property" }, 403);
      }
      query = query.eq("property_id", propertyId);
    } else {
      query = query.eq("guest_id", c.get("user")!.id);
    }
    const { data, error } = await query;
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
    const capacityError = await checkBookingCapacity(supabase, bookingBody.property_id, bookingBody.guests);
    if (capacityError) return c.json({ error: capacityError.error }, capacityError.status);
    const { data, error } = await supabase
      .from("bookings")
      .insert({ ...bookingBody, guest_id: c.get("user")!.id, status: bookingBody.status ?? "pending" })
      .select("*")
      .single();
    if (error?.code === "23505") {
      return c.json({ error: "Booking ID already exists" }, 409);
    }
    if (error?.code === "23P01") return c.json({ error: "This property is already booked for the selected dates. Choose different dates." }, 409);
    if (error?.code === "23514" && error.message === "Guest count exceeds property capacity") return c.json({ error: "The property's capacity has changed. Choose fewer guests and try again." }, 409);
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
    const capacityError = await checkBookingCapacity(supabase, bookingBody.property_id, bookingBody.guests);
    if (capacityError) return c.json({ error: capacityError.error }, capacityError.status);
    const { data, error } = await supabase
      .from("bookings")
      .update({ ...bookingBody, booking_id: id, status: bookingBody.status ?? "pending" })
      .eq("booking_id", id)
      .select("*")
      .maybeSingle();
    if (error?.code === "23P01") return c.json({ error: "This property is already booked for the selected dates. Choose different dates." }, 409);
    if (error?.code === "23514" && error.message === "Guest count exceeds property capacity") return c.json({ error: "The property's capacity has changed. Choose fewer guests and try again." }, 409);
    if (error?.code === "42501") return c.json({ error: "Booking access denied" }, 403);
    if (error) throw error;
    if (!data) return c.json({ error: "Booking not found" }, 404);
    return c.json(data);
  } catch (error) {
    console.error("Failed to update booking", error);
    return c.json({ error: "Failed to update booking" }, 500);
  }
});

bookingApp.post("/:id/confirm", async (c) => {
  const supabase = c.get("supabase");
  const id = c.req.param("id");
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  try {
    const { data: booking, error: readError } = await supabase.from("bookings").select("*").eq("booking_id", id).maybeSingle();
    if (readError) throw readError;
    if (!booking) return c.json({ error: "Booking not found" }, 404);
    const { data: property, error: ownerError } = await supabase.from("properties").select("owner_id").eq("property_id", booking.property_id).maybeSingle();
    if (ownerError) throw ownerError;
    if (property?.owner_id !== c.get("user")!.id) return c.json({ error: "Only the property owner can confirm bookings" }, 403);
    if (booking.status !== "pending" || booking.check_in < today) return c.json({ error: "Only pending bookings with current or future check-in can be confirmed" }, 409);
    const { data, error } = await supabase.from("bookings").update({ status: "confirmed" })
      .eq("booking_id", id).eq("status", "pending").gte("check_in", today).select("*").maybeSingle();
    if (error?.code === "42501") return c.json({ error: "Only the property owner can confirm bookings" }, 403);
    if (error?.code === "23514") return c.json({ error: "This booking cannot be confirmed" }, 409);
    if (error) throw error;
    if (!data) return c.json({ error: "Booking changed. Refresh and try again." }, 409);
    return c.json(data);
  } catch (error) {
    console.error("Failed to confirm booking", error);
    return c.json({ error: "Failed to confirm booking" }, 500);
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
  const id = c.req.param("id");
  const userId = c.get("user")!.id;
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm",
    year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  try {
    const { data: booking, error: readError } = await supabase.from("bookings")
      .select("*").eq("booking_id", id).maybeSingle();
    if (readError) throw readError;
    if (!booking) return c.json({ error: "Booking not found" }, 404);
    let isOwner = false;
    if (booking.guest_id !== userId || booking.status === "cancelled") {
      const { data: property, error: ownerError } = await supabase.from("properties")
        .select("owner_id").eq("property_id", booking.property_id).maybeSingle();
      if (ownerError) throw ownerError;
      isOwner = property?.owner_id === userId;
      if (!isOwner && booking.guest_id !== userId) return c.json({ error: "Booking access denied" }, 403);
    }
    if (booking.status === "cancelled" && !isOwner) {
      return c.json({ error: "Only the property owner can delete cancelled bookings" }, 403);
    }
    const deletableStatuses = isOwner ? ["pending", "confirmed", "cancelled"] : ["pending", "confirmed"];
    if (!deletableStatuses.includes(booking.status)) return c.json({ error: "This booking cannot be deleted" }, 409);
    const checkIn = new Date(booking.check_in + "T00:00:00Z");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(booking.check_in) || Number.isNaN(checkIn.getTime())
      || checkIn.toISOString().slice(0, 10) !== booking.check_in || booking.check_in < today) {
      return c.json({ error: "Bookings with past or invalid check-in dates cannot be deleted" }, 409);
    }
    const { data, error } = await supabase.from("bookings").delete()
      .eq("booking_id", id).in("status", booking.status === "cancelled" ? ["cancelled"] : ["pending", "confirmed"])
      .gte("check_in", today).select("*").maybeSingle();
    if (error?.code === "42501") return c.json({ error: "Booking access denied" }, 403);
    if (error?.code === "23514") return c.json({ error: "This booking can no longer be deleted" }, 409);
    if (error) throw error;
    if (!data) return c.json({ error: "Booking changed. Refresh and try again." }, 409);
    return c.json(data);
  } catch (error) {
    console.error("Failed to delete booking", error);
    return c.json({ error: "Failed to delete booking" }, 500);
  }
});

export default bookingApp;
