"use client";

import { useState } from "react";
import { confirmBooking } from "@/lib/api";
import type { Booking } from "@/types/booking";

export default function ConfirmBookingButton({ booking, onConfirmed }: {
  booking: Booking; onConfirmed: (booking: Booking) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  if (booking.status !== "pending" || booking.check_in < today) return null;
  async function confirm() {
    setPending(true); setError("");
    try { onConfirmed(await confirmBooking(booking.booking_id)); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not confirm booking."); }
    finally { setPending(false); }
  }
  return <div className="booking-actions">
    <button type="button" disabled={pending} onClick={confirm}>{pending ? "Confirming…" : "Confirm booking"}</button>
    {error && <p role="alert">{error}</p>}
  </div>;
}
