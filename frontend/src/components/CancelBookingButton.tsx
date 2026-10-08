"use client";

import { useState } from "react";
import { cancelBooking } from "@/lib/api";
import type { Booking } from "@/types/booking";

export default function CancelBookingButton({ booking, onCancelled }: {
  booking: Booking;
  onCancelled: (booking: Booking) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());

  if (booking.status === "cancelled") return <p>This booking has been cancelled.</p>;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(booking.check_in) || booking.check_in < today) {
    return <p>This booking cannot be cancelled because its check-in date has passed or is invalid.</p>;
  }

  async function cancel() {
    setPending(true);
    setError("");
    try {
      const updated = await cancelBooking(booking.booking_id);
      onCancelled(updated);
      setConfirming(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not cancel booking. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return <div className="booking-actions">
    {confirming ? <>
      <p>Cancel this booking? Your reservation will be marked as cancelled.</p>
      <button type="button" onClick={cancel} disabled={pending}>{pending ? "Cancelling…" : "Confirm cancellation"}</button>
      <button type="button" onClick={() => { setConfirming(false); setError(""); }} disabled={pending}>Keep booking</button>
    </> : <button type="button" onClick={() => setConfirming(true)}>Cancel booking</button>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
