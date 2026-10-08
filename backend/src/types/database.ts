// Application-facing public schema after migrations 001–016.
// Maintained from the repository SQL and API fields; update with schema changes.
export type BookingStatus = "pending" | "confirmed" | "cancelled";

export type PropertyRow = {
  property_id: string;
  owner_id: string | null;
  title: string;
  description: string;
  location: string;
  price_per_night: number;
  max_guests: number;
  image_url: string | null;
  created_at: string;
  deleted_at: string | null;
};
export type PropertyInsert = Pick<PropertyRow,
  "title" | "description" | "location" | "price_per_night" | "max_guests">
  & Partial<Pick<PropertyRow, "property_id" | "owner_id" | "created_at" | "deleted_at" | "image_url">>;

export type BookingRow = {
  booking_id: string;
  property_id: string;
  guest_id: string | null;
  guest_name: string;
  guest_email: string;
  check_in: string;
  check_out: string;
  guests: number;
  status: BookingStatus;
  deleted_property_title: string | null;
};
export type BookingInsert = Pick<BookingRow,
  "property_id" | "guest_name" | "guest_email" | "check_in" | "check_out" | "guests">
  & Partial<Pick<BookingRow, "booking_id" | "guest_id" | "status" | "deleted_property_title">>;

export type PropertyHost = { name: string; avatar_url: string | null };

export type DeletePropertyResult = { property: PropertyRow; cancelled_bookings: number };

export type Database = {
  public: {
    Tables: {
      properties: { Row: PropertyRow; Insert: PropertyInsert; Update: Partial<PropertyRow>; Relationships: [] };
      // Migration 011 removes the property FK to retain historical bookings.
      bookings: { Row: BookingRow; Insert: BookingInsert; Update: Partial<BookingRow>; Relationships: [] };
    };
    Views: { [_ in never]: never };
    Functions: {
      get_property_host: { Args: { p_property_id: string }; Returns: PropertyHost | null };
      delete_property: { Args: { p_property_id: string }; Returns: DeletePropertyResult | null };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
