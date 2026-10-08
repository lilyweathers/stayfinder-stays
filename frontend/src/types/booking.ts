export interface Booking {
  guest_id: string | null;
  booking_id: string;
  property_id: string;
  deleted_property_title?: string | null;
  guest_name: string;
  guest_email: string;
  check_in: string;
  check_out: string;
  guests: number;
  status: "pending" | "confirmed" | "cancelled";
}

export type NewBooking = Omit<Booking, "booking_id" | "status" | "guest_id" | "deleted_property_title">;
