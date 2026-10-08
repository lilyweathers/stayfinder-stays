"use client";

import { useState, type FormEvent } from "react";
import { updateBooking } from "@/lib/api";
import { validateBookingForm } from "@/lib/booking-validation";
import type { Booking } from "@/types/booking";

export default function BookingEditForm({ booking, maxGuests, onSaved }: {
  booking: Booking; maxGuests: number; onSaved: (booking: Booking) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  if (booking.status === "cancelled" || booking.check_in < today) return <p>This booking is read-only.</p>;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const checkIn = String(data.get("check_in"));
    const checkOut = String(data.get("check_out"));
    setError("");
    setNotice("");
    const values = {
      guest_name: String(data.get("guest_name") || "").trim(),
      guest_email: String(data.get("guest_email") || "").trim(),
      check_in: checkIn, check_out: checkOut, guests: Number(data.get("guests")),
    };
    const validationErrors = validateBookingForm(values, maxGuests);
    if (validationErrors.length) { setError(validationErrors.join(" ")); return; }
    setPending(true);
    try {
      const updated = await updateBooking(booking.booking_id, {
        property_id: booking.property_id,
        ...values, status: booking.status,
      });
      onSaved(updated);
      setEditing(false);
      setNotice("Booking saved.");
    } catch (error) { setError(error instanceof Error ? error.message : "Could not save booking."); }
    finally { setPending(false); }
  }
  return <section className="booking-actions">
    {editing ? <form onSubmit={submit} noValidate>
      <label>Guest name<input name="guest_name" required defaultValue={booking.guest_name} /></label>
      <label>Guest email<input name="guest_email" type="email" required defaultValue={booking.guest_email} /></label>
      <label>Check-in<input name="check_in" type="date" min={today} required defaultValue={booking.check_in} /></label>
      <label>Check-out<input name="check_out" type="date" min={today} required defaultValue={booking.check_out} /></label>
      <label>Guests<input name="guests" type="number" min={1} max={maxGuests} step={1} required defaultValue={booking.guests} /></label>
      <button disabled={pending}>{pending ? "Saving…" : "Save booking"}</button>
      <button type="button" disabled={pending} onClick={() => { setEditing(false); setError(""); }}>Discard changes</button>
    </form> : <button type="button" onClick={() => { setEditing(true); setNotice(""); }}>Edit booking</button>}
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}
