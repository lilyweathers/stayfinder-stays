"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, getBookings } from "@/lib/api";
import type { Booking } from "@/types/booking";

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  useEffect(() => {
    let active = true;
    getBookings().then(data => {
      if (active) setBookings(data);
    }).catch(error => {
      if (!active) return;
      setNeedsLogin(error instanceof ApiError && error.status === 401);
      setError(error instanceof Error ? error.message : "Could not load bookings.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <main>
      <h1>Your bookings</h1>
      {loading && <p role="status">Loading bookings…</p>}
      {error && <p role="alert">{error}</p>}
      {needsLogin && <Link href="/login">Sign in to view your bookings</Link>}
      {!loading && !error && bookings.length === 0 && <p>You have no bookings yet. <Link href="/properties">Browse properties</Link></p>}
      {bookings.map(booking => (
        <article className="card" key={booking.booking_id}>
          <h2><Link href={`/properties/${encodeURIComponent(booking.property_id)}`}>View booked property</Link></h2>
          <p>{booking.check_in} to {booking.check_out}</p>
          <p>{booking.guests} guests · {booking.status}</p>
          <p>Booking reference: {booking.booking_id}</p>
        </article>
      ))}
    </main>
  );
}
