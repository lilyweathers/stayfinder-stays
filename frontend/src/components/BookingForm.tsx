"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ApiError, createBooking } from "@/lib/api";
import type { Property } from "@/types/property";

export default function BookingForm({ property }: { property: Property }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [created, setCreated] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const checkIn = String(data.get("check_in"));
    const checkOut = String(data.get("check_out"));
    setNeedsLogin(false);
    setCreated(false);
    if (checkOut <= checkIn) {
      setMessage("Check-out must be after check-in.");
      return;
    }
    setPending(true);
    setMessage("");
    try {
      await createBooking({
        property_id: property.property_id,
        guest_name: String(data.get("guest_name")),
        guest_email: String(data.get("guest_email")),
        check_in: checkIn,
        check_out: checkOut,
        guests: Number(data.get("guests")),
      });
      setMessage("Your booking was created.");
      setCreated(true);
      form.reset();
    } catch (error) {
      setNeedsLogin(error instanceof ApiError && error.status === 401);
      setMessage(error instanceof Error ? error.message : "Could not create booking.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section>
      <h2>Book this stay</h2>
      <p>Sign in before submitting a booking.</p>
      <form onSubmit={submit}>
        <label>Name<input name="guest_name" required autoComplete="name" /></label>
        <label>Email<input name="guest_email" type="email" required autoComplete="email" /></label>
        <label>Check-in<input name="check_in" type="date" required /></label>
        <label>Check-out<input name="check_out" type="date" required /></label>
        <label>Guests<input name="guests" type="number" min={1} max={property.max_guests} defaultValue={1} required /></label>
        <button disabled={pending}>{pending ? "Booking…" : "Create booking"}</button>
      </form>
      <p role="status">{message}</p>
      {needsLogin && <Link href="/login">Sign in</Link>}
      {created && <Link href="/bookings">View your bookings</Link>}
    </section>
  );
}
