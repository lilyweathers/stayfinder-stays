"use client";

import { useState } from "react";
import { deleteBooking } from "@/lib/api";
import type { Booking } from "@/types/booking";

export default function DeleteBookingButton({ booking, onDeleted }: {
  booking: Booking; onDeleted: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm",
    year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const checkIn = new Date(booking.check_in + "T00:00:00Z");
  if (!["pending", "confirmed"].includes(booking.status)
    || !/^\d{4}-\d{2}-\d{2}$/.test(booking.check_in) || Number.isNaN(checkIn.getTime())
    || checkIn.toISOString().slice(0, 10) !== booking.check_in || booking.check_in < today) return null;

  async function remove() {
    setPending(true);
    setError("");
    try {
      await deleteBooking(booking.booking_id);
      onDeleted(booking.booking_id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete booking. Please try again.");
    } finally { setPending(false); }
  }

  return <div className="booking-actions">
    {confirming ? <>
      <p>Permanently delete the booking for {booking.guest_name}, {booking.check_in} to {booking.check_out}? This cannot be undone.</p>
      <button type="button" disabled={pending} onClick={remove}>{pending ? "Deleting…" : "Confirm deletion"}</button>
      <button type="button" disabled={pending} onClick={() => { setConfirming(false); setError(""); }}>Keep booking</button>
    </> : <button type="button" onClick={() => setConfirming(true)}>Delete booking</button>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
