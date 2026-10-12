import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { bookingValidator } from "../validators/bookingValidator.js";
import { bookingToday } from "../lib/booking-date.js";
import { calculateBookingPrice } from "../lib/booking-price.js";
import { checkBookingCapacity } from "../lib/booking-capacity.js";

const bookingApp = new Hono({ strict: false });
// Vg1: Alla bokningsrutter kräver en verifierad inloggad användare.
bookingApp.use("*", requireAuth);

bookingApp.get("/", async (c) => {
  const supabase = c.get("supabase");
  try {
    const propertyId = c.req.query("property_id");
    let query = supabase.from("bookings").select("*");
    if (propertyId) {
      // Vg1: Endast boendets ägare får hämta hela bokningslistan för boendet.
      const { data: property, error: ownerError } = await supabase.from("properties")
        .select("owner_id").eq("property_id", propertyId).maybeSingle();
      if (ownerError) throw ownerError;
      if (property?.owner_id !== c.get("user")!.id) {
        return c.json({ error: "Only the property owner can view all bookings for this property" }, 403);
      }
      query = query.eq("property_id", propertyId);
    } else {
      // Gästens lista filtreras med den verifierade identiteten.
      // Ett guest_id som skickas i URL:en ger inte åtkomst till någon annans bokningar.
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
  // Vg1: RLS visar bara bokningen för dess gäst eller boendets ägare.
  // En dold eller saknad bokning ger 404 utan att avslöja någon annans uppgifter.
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
    // Vg4: Nya bokningar måste börja som pending; gästen kan inte skapa en bekräftad bokning.
    if (bookingBody.status && bookingBody.status !== "pending") return c.json({ error: "New bookings must be pending" }, 409);
    // Vg3: Kontrollera gästantalet mot boendets aktuella kapacitet vid både skapande och ändring.
    const capacityError = await checkBookingCapacity(supabase, bookingBody.property_id, bookingBody.guests);
    if ("error" in capacityError) return c.json({ error: capacityError.error }, capacityError.status);
    // Vg6: En ny bokning får boendets aktuella databaspris, aldrig ett pris valt av klienten.
    const price = calculateBookingPrice(bookingBody.check_in, bookingBody.check_out, capacityError.nightly_price);
    // Vg1: Koppla bokningen till den verifierade användaren.
    // guest_id från klienten är inte ett tillåtet fält i validatorn.
    const { data, error } = await supabase
      .from("bookings")
      .insert({ ...bookingBody, ...price, guest_id: c.get("user")!.id, status: bookingBody.status ?? "pending" })
      .select("*")
      .single();
    if (error?.code === "23505") {
      return c.json({ error: "Booking ID already exists" }, 409);
    }
    // Vg2: Databasen stoppar överlapp och ger 23P01. Svara med 409 och ett
    // tydligt meddelande utan att avslöja andra gästers bokningsuppgifter.
    if (error?.code === "23P01") return c.json({ error: "This property is already booked for the selected dates. Choose different dates." }, 409);
    if (error?.code === "23514" && error.message === "Guest count exceeds property capacity") return c.json({ error: "The property's capacity has changed. Choose fewer guests and try again." }, 409);
    // Vg4: Nekad behörighet i databasen blir 403; RLS och triggers skyddar även direkta anrop.
    if (error?.code === "42501") return c.json({ error: "Booking access denied" }, 403);
    // Vg4: Databasens status- och andra regelbrott blir 409 även om API-kontrollen passerade.
    if (error?.code === "23514") return c.json({ error: "This booking cannot be created. Check its dates and status." }, 409);
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
    const { data: booking, error: readError } = await supabase.from("bookings")
      .select("*").eq("booking_id", id).maybeSingle();
    if (readError?.code === "42501") return c.json({ error: "Booking access denied" }, 403);
    if (readError) throw readError;
    if (!booking) return c.json({ error: "Booking not found" }, 404);
    const userId = c.get("user")!.id;
    const status = bookingBody.status ?? booking.status;
    // Vg4: Endast gästen eller boendets ägare får ändra; bekräftelse kräver alltid ägaren.
    // Vg1: Gästen får redigera sin bokning inom övriga regler.
    // Om användaren inte är gästen, eller vill ändra status till confirmed,
    // måste användaren vara ägare till bokningens befintliga boende.
    if (booking.guest_id !== userId || (status === "confirmed" && status !== booking.status)) {
      const { data: property, error: ownerError } = await supabase.from("properties")
        .select("owner_id").eq("property_id", booking.property_id).maybeSingle();
      if (ownerError) throw ownerError;
      if (property?.owner_id !== userId) return c.json({ error: status === "confirmed" && status !== booking.status
        ? "Only the property owner can confirm bookings" : "Booking access denied" }, 403);
    }
    // Vg5: Kontrollera det redan sparade datumet så att en gammal bokning inte kan flyttas fram och redigeras.
    if (booking.check_in < bookingToday()) return c.json({ error: "Bookings with past check-in dates cannot be edited" }, 409);
    // Vg4: En avbokad bokning får inte redigeras eller aktiveras igen.
    if (booking.status === "cancelled") return c.json({ error: "Cancelled bookings cannot be edited" }, 409);
    // Vg4: Tillåt endast pending till confirmed samt pending/confirmed till cancelled.
    if (status !== booking.status && !(booking.status === "pending" && status === "confirmed")
      && !(["pending", "confirmed"].includes(booking.status) && status === "cancelled")) {
      return c.json({ error: "Booking status transition is not allowed" }, 409);
    }
    // Vg3: Kontrollera gästantalet mot boendets aktuella kapacitet även vid ändring.
    const capacityError = await checkBookingCapacity(supabase, bookingBody.property_id, bookingBody.guests);
    if ("error" in capacityError) return c.json({ error: capacityError.error }, capacityError.status);
    // Vg6: Vid datumändring används bokningens sparade nattpris, även om boendets pris har ändrats.
    const price = calculateBookingPrice(bookingBody.check_in, bookingBody.check_out, booking.nightly_price);
    const { data, error } = await supabase
      .from("bookings")
      .update({ ...bookingBody, ...price, booking_id: id, status })
      .eq("booking_id", id)
      // Vg4: Skriv bara om status fortfarande är densamma; annars har ett annat anrop ändrat bokningen.
      .eq("status", booking.status)
      .select("*")
      .maybeSingle();
    // Vg2: Även ändrade datum måste följa databasens överlappningsregel.
    // Kontrollen i databasen gäller också bokningar som gästens RLS döljer.
    if (error?.code === "23P01") return c.json({ error: "This property is already booked for the selected dates. Choose different dates." }, 409);
    if (error?.code === "23514" && error.message === "Guest count exceeds property capacity") return c.json({ error: "The property's capacity has changed. Choose fewer guests and try again." }, 409);
    // Vg4: Nekad behörighet i databasen blir 403; RLS och triggers skyddar även direkta anrop.
    if (error?.code === "42501") return c.json({ error: "Booking access denied" }, 403);
    // Vg4: Databasens status- och andra regelbrott blir 409 även om API-kontrollen passerade.
    if (error?.code === "23514") return c.json({ error: "This booking cannot be edited or its status changed" }, 409);
    if (error) throw error;
    // Vg4: Om ingen rad matchar skrivvillkoren har bokningen ändrats; be användaren uppdatera sidan.
    if (!data) return c.json({ error: "Booking changed. Refresh and try again." }, 409);
    return c.json(data);
  } catch (error) {
    console.error("Failed to update booking", error);
    return c.json({ error: "Failed to update booking" }, 500);
  }
});

bookingApp.post("/:id/confirm", async (c) => {
  const supabase = c.get("supabase");
  const id = c.req.param("id");
  const today = bookingToday();
  try {
    const { data: booking, error: readError } = await supabase.from("bookings").select("*").eq("booking_id", id).maybeSingle();
    if (readError) throw readError;
    if (!booking) return c.json({ error: "Booking not found" }, 404);
    const { data: property, error: ownerError } = await supabase.from("properties").select("owner_id").eq("property_id", booking.property_id).maybeSingle();
    if (ownerError) throw ownerError;
    // Vg4: Endast boendets ägare får bekräfta bokningen; gästen saknar denna behörighet.
    // Vg1: Inloggning räcker inte för bekräftelse; användaren måste vara ägaren.
    if (property?.owner_id !== c.get("user")!.id) return c.json({ error: "Only the property owner can confirm bookings" }, 403);
    // Vg4: Bekräftelse kräver pending. Redan bekräftade och avbokade bokningar nekas.
    if (booking.status !== "pending" || booking.check_in < today) return c.json({ error: "Only pending bookings with current or future check-in can be confirmed" }, 409);
    const { data, error } = await supabase.from("bookings").update({ status: "confirmed" })
      .eq("booking_id", id).eq("status", "pending").gte("check_in", today).select("*").maybeSingle();
    // Vg4: Nekad behörighet i databasen blir 403; RLS och triggers skyddar även direkta anrop.
    if (error?.code === "42501") return c.json({ error: "Only the property owner can confirm bookings" }, 403);
    // Vg4: Databasens status- och andra regelbrott blir 409 även om API-kontrollen passerade.
    if (error?.code === "23514") return c.json({ error: "This booking cannot be confirmed" }, 409);
    if (error) throw error;
    // Vg4: Om ingen rad matchar skrivvillkoren har bokningen ändrats; be användaren uppdatera sidan.
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
  const today = bookingToday();
  try {
    const { data: booking, error: readError } = await supabase.from("bookings")
      .select("*").eq("booking_id", id).maybeSingle();
    if (readError) throw readError;
    if (!booking) return c.json({ error: "Booking not found" }, 404);
    // Vg4: Gästen får avboka sin egen bokning; annars krävs att användaren äger boendet.
    if (booking.guest_id !== userId) {
      // Vg1: Gästen kan avboka sin bokning. För andra användare kontrolleras
      // att de äger boendet; en orelaterad användare får inte avboka.
      const { data: property, error: propertyError } = await supabase.from("properties")
        .select("owner_id").eq("property_id", booking.property_id).maybeSingle();
      if (propertyError) throw propertyError;
      if (property?.owner_id !== userId) return c.json({ error: "Booking access denied" }, 403);
    }
    // Vg4: Bara pending och confirmed kan bli cancelled; upprepad avbokning nekas.
    if (!["pending", "confirmed"].includes(booking.status)) {
      return c.json({ error: "Only pending or confirmed bookings can be cancelled" }, 409);
    }
    const checkIn = new Date(`${booking.check_in}T00:00:00Z`);
    // Vg5: Avvisa ogiltiga och passerade incheckningsdatum; incheckning idag är tillåten.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(booking.check_in) || Number.isNaN(checkIn.getTime())
      || checkIn.toISOString().slice(0, 10) !== booking.check_in || booking.check_in < today) {
      return c.json({ error: "Bookings with past or invalid check-in dates cannot be cancelled" }, 409);
    }
    // Vg4/Vg5: Kontrollera status och datum igen vid skrivningen så att samtidiga ändringar inte kringgår reglerna.
    const { data, error } = await supabase.from("bookings")
      .update({ status: "cancelled" }).eq("booking_id", id)
      .in("status", ["pending", "confirmed"]).gte("check_in", today)
      .select("*").maybeSingle();
    // Vg4: Nekad behörighet i databasen blir 403; RLS och triggers skyddar även direkta anrop.
    if (error?.code === "42501") return c.json({ error: "Booking access denied" }, 403);
    // Vg4: Databasens status- och andra regelbrott blir 409 även om API-kontrollen passerade.
    if (error?.code === "23514") return c.json({ error: "This booking can no longer be cancelled" }, 409);
    if (error) throw error;
    // Vg4: Om ingen rad matchar skrivvillkoren har bokningen ändrats; be användaren uppdatera sidan.
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
  const today = bookingToday();
  try {
    const { data: booking, error: readError } = await supabase.from("bookings")
      .select("*").eq("booking_id", id).maybeSingle();
    if (readError) throw readError;
    if (!booking) return c.json({ error: "Booking not found" }, 404);
    let isOwner = false;
    // Vg1: Borttagning kräver att användaren är gästen eller boendets ägare.
    // Avbokade bokningar får endast tas bort av ägaren; datumregler gäller också.
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
    // Vg5: Avvisa ogiltiga och passerade incheckningsdatum; incheckning idag är tillåten.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(booking.check_in) || Number.isNaN(checkIn.getTime())
      || checkIn.toISOString().slice(0, 10) !== booking.check_in || booking.check_in < today) {
      return c.json({ error: "Bookings with past or invalid check-in dates cannot be deleted" }, 409);
    }
    const { data, error } = await supabase.from("bookings").delete()
      .eq("booking_id", id).in("status", booking.status === "cancelled" ? ["cancelled"] : ["pending", "confirmed"])
      .gte("check_in", today).select("*").maybeSingle();
    // Vg4: Nekad behörighet i databasen blir 403; RLS och triggers skyddar även direkta anrop.
    if (error?.code === "42501") return c.json({ error: "Booking access denied" }, 403);
    // Vg4: Databasens status- och andra regelbrott blir 409 även om API-kontrollen passerade.
    if (error?.code === "23514") return c.json({ error: "This booking can no longer be deleted" }, 409);
    if (error) throw error;
    // Vg4: Om ingen rad matchar skrivvillkoren har bokningen ändrats; be användaren uppdatera sidan.
    if (!data) return c.json({ error: "Booking changed. Refresh and try again." }, 409);
    return c.json(data);
  } catch (error) {
    console.error("Failed to delete booking", error);
    return c.json({ error: "Failed to delete booking" }, 500);
  }
});

export default bookingApp;
