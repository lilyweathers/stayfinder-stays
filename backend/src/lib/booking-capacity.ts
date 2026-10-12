import type { BasicSupabaseClient } from "../types/supabase.js";

export async function checkBookingCapacity(supabase: BasicSupabaseClient, propertyId: string, guests: number) {
  // Vg3: Läs aktuell kapacitet från databasen; klientens uppgifter om boendet är inte betrodda.
  const { data: property, error } = await supabase.from("properties")
    .select("max_guests,price_per_night").eq("property_id", propertyId).is("deleted_at", null).maybeSingle();
  if (error) throw error;
  if (!property) return { error: "Property not found", status: 404 as const };
  // Vg3: Stoppa för många gäster före skrivningen. Databasens trigger kontrollerar gränsen igen.
  if (guests > property.max_guests) return {
    error: `This property allows up to ${property.max_guests} ${property.max_guests === 1 ? "guest" : "guests"}.`, status: 400 as const,
  };
  return { nightly_price: property.price_per_night };
}
