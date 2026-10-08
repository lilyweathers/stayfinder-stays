import type { BasicSupabaseClient } from "../src/types/supabase.js";
import type { BookingRow, PropertyRow, DeletePropertyResult } from "../src/types/database.js";

// Compile-only assertions: never called, so no database requests are sent.
export async function assertDatabaseTypes(client: BasicSupabaseClient) {
  const properties = await client.from("properties").select("*");
  const propertyRows: PropertyRow[] | null = properties.data;
  const bookings = await client.from("bookings").select("*");
  const bookingRows: BookingRow[] | null = bookings.data;
  const deletion = await client.rpc("delete_property", { p_property_id: "property-id" });
  const deletionResult: DeletePropertyResult | null = deletion.data;
  void [propertyRows, bookingRows, deletionResult];
  // @ts-expect-error Unknown tables must not be accepted.
  client.from("unknown_table");
  // @ts-expect-error A price is numeric, never a string.
  client.from("properties").update({ price_per_night: "1200" });
  // @ts-expect-error Invalid booking statuses must not be accepted.
  client.from("bookings").update({ status: "approved" });
  // @ts-expect-error Required insert fields must not be omitted.
  client.from("bookings").insert({ guest_name: "Guest" });
  // @ts-expect-error RPC property ID is a string, never a number.
  client.rpc("delete_property", { p_property_id: 123 });
  // @ts-expect-error RPC name is checked against the schema.
  client.rpc("unknown_function", {});
}
