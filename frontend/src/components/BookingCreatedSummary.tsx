"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, getBooking, getProperty } from "@/lib/api";
import { calculateBookingPreview } from "@/lib/booking-validation";
import PropertyImage from "@/components/PropertyImage";
import type { Booking } from "@/types/booking";
import type { Property } from "@/types/property";

export default function BookingCreatedSummary({ bookingId }: { bookingId: string }) {
  const [result, setResult] = useState<{ booking: Booking; property: Property | null } | null>(null);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const booking = await getBooking(bookingId);
        const property = await getProperty(booking.property_id).catch(() => null);
        if (active) setResult({ booking, property });
      } catch (error) {
        if (!active) return;
        const unauthorized = error instanceof ApiError && error.status === 401;
        setNeedsLogin(unauthorized);
        setError(unauthorized ? "Sign in to view your booking summary." : error instanceof ApiError && error.status === 404
          ? "This booking could not be found or is not available to your account."
          : "Could not load your booking summary. Please try again.");
      }
    }
    void load();
    return () => { active = false; };
  }, [bookingId, attempt]);

  if (error) return <main className="booking-confirmation"><h1>Booking summary</h1><p role="alert">{error}</p>
    <div className="confirmation-actions">{needsLogin
      ? <Link className="empty-state-link" href={`/login?returnTo=${encodeURIComponent(`/bookings/${bookingId}/created`)}`}>Sign in</Link>
      : <button type="button" onClick={() => { setError(""); setAttempt(value => value + 1); }}>Try again</button>}
      <Link href="/bookings">View your bookings</Link></div></main>;
  if (!result) return <main className="booking-confirmation"><p role="status">Loading your booking summary…</p></main>;

  const { booking, property } = result;
  const title = property?.title || booking.deleted_property_title || "Your stay";
  const preview = calculateBookingPreview(booking.check_in, booking.check_out, property?.price_per_night ?? 0);
  const formatDate = (date: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
  const formatPrice = (price: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(price);
  return <main className="booking-confirmation">
    <header className="confirmation-heading">
      <span className="confirmation-icon" aria-hidden="true">✓</span>
      <p className="home-eyebrow">{booking.status === "cancelled" ? "Stay details" : "Something to look forward to"}</p>
      <h1>{booking.status === "cancelled" ? "Booking summary" : "Your booking is created"}</h1>
      <p>{booking.status === "pending" ? "Your request is saved. Your host will review and confirm your stay." : booking.status === "confirmed" ? "Your host has confirmed your stay." : "This booking has been cancelled."}</p>
    </header>
    <section className="confirmation-card" aria-labelledby="confirmation-stay">
      {property && <PropertyImage src={property.image_url} title={title} />}
      <div className="confirmation-card-content">
        <div className="confirmation-property"><div><h2 id="confirmation-stay">{title}</h2>{property && <p>{property.location}</p>}</div>
          <span className={`confirmation-status confirmation-status-${booking.status}`}>{booking.status === "pending" ? "Awaiting host confirmation" : booking.status === "confirmed" ? "Confirmed" : "Cancelled"}</span></div>
        <dl className="confirmation-details">
          <div><dt>Check-in</dt><dd>{formatDate(booking.check_in)}</dd></div>
          <div><dt>Check-out</dt><dd>{formatDate(booking.check_out)}</dd></div>
          <div><dt>Length of stay</dt><dd>{preview?.nights ?? "—"} {preview?.nights === 1 ? "night" : "nights"}</dd></div>
          <div><dt>Guests</dt><dd>{booking.guests} {booking.guests === 1 ? "guest" : "guests"}</dd></div>
          <div><dt>Guest name</dt><dd>{booking.guest_name}</dd></div>
          <div><dt>Email</dt><dd>{booking.guest_email}</dd></div>
        </dl>
        {property && preview && <div className="confirmation-price"><div><span>Estimated total</span><strong>{formatPrice(preview.total)}</strong></div>
          <p>{preview.nights} {preview.nights === 1 ? "night" : "nights"} × {formatPrice(property.price_per_night)} at the current nightly rate.</p></div>}
        <p className="confirmation-reference">Booking reference <span>{booking.booking_id}</span></p>
      </div>
    </section>
    <div className="confirmation-actions"><Link className="empty-state-link" href="/bookings">View your bookings <span aria-hidden="true">→</span></Link>
      {property && <Link href={`/properties/${encodeURIComponent(property.property_id)}`}>Back to property</Link>}
      <Link href="/properties">Browse more stays</Link></div>
  </main>;
}
