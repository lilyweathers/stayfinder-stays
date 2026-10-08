"use client";

import Link from "next/link";
import PropertyImage from "@/components/PropertyImage";
import { useEffect, useState } from "react";
import { ApiError, getBookings, getProperties } from "@/lib/api";
import type { Booking } from "@/types/booking";
import type { Property } from "@/types/property";
import CancelBookingButton from "@/components/CancelBookingButton";

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [propertyId, setPropertyId] = useState("");
  const [status, setStatus] = useState("");
  const [notice, setNotice] = useState("");
  const [propertiesLoaded, setPropertiesLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const [result, propertyResult] = await Promise.allSettled([getBookings(), getProperties()]);
      if (!active) return;
      if (result.status === "fulfilled") setBookings(result.value);
      else {
        const unauthorized = result.reason instanceof ApiError && result.reason.status === 401;
        setNeedsLogin(unauthorized);
        setError(unauthorized ? "Sign in to view bookings." : "Could not load bookings. Please try again.");
      }
      if (propertyResult.status === "fulfilled") {
        setProperties(propertyResult.value);
        setPropertiesLoaded(true);
      }
      else setWarning("Property names are unavailable. Showing property references instead.");
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [attempt]);

  function retry() {
    setLoading(true);
    setError("");
    setWarning("");
    setNeedsLogin(false);
    setBookings([]);
    setPropertiesLoaded(false);
    setAttempt(value => value + 1);
  }

  const propertyById = new Map(properties.map(property => [property.property_id, property]));
  const availableBookings = bookings;
  const bookedPropertyIds = [...new Set(availableBookings.map(booking => booking.property_id))];
  const visibleBookings = availableBookings.filter(booking =>
    (!propertyId || booking.property_id === propertyId) && (!status || booking.status === status),
  );

  return (
    <main>
      <div className="my-properties-heading">
        <div><h1>Bookings</h1><p>Your upcoming stays and booking history.</p><p>Hosting guests? Manage their bookings under <Link href="/my-properties">My Properties</Link>.</p></div>
        {!loading && !needsLogin && !error && <button type="button" onClick={retry}>Refresh bookings</button>}
      </div>
      {notice && <p role="status">{notice}</p>}
      {loading && <p role="status">Loading bookings...</p>}
      {error && <p role="alert">{error}</p>}
      {needsLogin ? <Link href="/login">Sign in</Link> : !loading && error && <button type="button" onClick={retry}>Try again</button>}
      {!loading && !error && <>
        {warning && <p role="status">{warning}</p>}
        {bookings.length === 0 ? (
          <section className="hosting-empty" aria-labelledby="empty-bookings-heading">
            <svg className="hosting-illustration" viewBox="0 0 200 160" fill="none" aria-hidden="true">
              <circle cx="100" cy="80" r="72" fill="#e6eee8" />
              <path d="M32 137h136" stroke="#9ab5a8" strokeWidth="3" strokeLinecap="round" />
              <path d="M81 55V43a7 7 0 0 1 7-7h24a7 7 0 0 1 7 7v12" stroke="#35605b" strokeWidth="4" />
              <rect x="57" y="55" width="86" height="76" rx="10" fill="#fffdf7" stroke="#35605b" strokeWidth="3" />
              <path d="M78 57v72m44-72v72" stroke="#d7a36c" strokeWidth="5" />
              <path d="M69 132v5m62-5v5" stroke="#35605b" strokeWidth="5" strokeLinecap="round" />
              <rect x="90" y="82" width="21" height="17" rx="3" fill="#d6e9ed" stroke="#35605b" strokeWidth="2" />
              <path d="m154 38 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill="#d7a36c" />
            </svg>
            <p className="home-eyebrow">Something to look forward to</p>
            <h2 id="empty-bookings-heading">Your next adventure starts here</h2>
            <p>No stays booked yet. Explore city studios, peaceful cabins, and lakeside escapes. Once you book, all your stay details will be right here.</p>
            <Link className="empty-state-link" href="/properties">Find your next stay <span aria-hidden="true">→</span></Link>
          </section>
        ) : <>
          <div className="booking-filters">
            <label>Property
              <select value={propertyId} onChange={event => setPropertyId(event.target.value)}>
                <option value="">All booked properties</option>
                {bookedPropertyIds.map(id => <option key={id} value={id}>{propertyById.get(id)?.title || bookings.find(booking => booking.property_id === id)?.deleted_property_title || id}</option>)}
              </select>
            </label>
            <label>Status
              <select value={status} onChange={event => setStatus(event.target.value)}>
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
          </div>
          <p role="status">Showing {visibleBookings.length} of {bookings.length} bookings</p>
          {visibleBookings.length === 0 && <p>No bookings match these filters.</p>}
          {visibleBookings.map(booking => {
            const property = propertyById.get(booking.property_id);
            return (
              <article className="card account-property-card" key={booking.booking_id}>
                {property && <Link href={`/properties/${encodeURIComponent(property.property_id)}`}><PropertyImage src={property.image_url} title={property.title} /></Link>}
                <h2>{property?.title || booking.deleted_property_title || (propertiesLoaded ? "Deleted property" : `Property ${booking.property_id}`)}</h2>
                {property && <p>{property.location}</p>}
                <dl className="booking-details">
                  <dt>Guest</dt><dd>{booking.guest_name}</dd>
                  <dt>Email</dt><dd>{booking.guest_email}</dd>
                  <dt>Check-in</dt><dd><time dateTime={booking.check_in}>{booking.check_in}</time></dd>
                  <dt>Check-out</dt><dd><time dateTime={booking.check_out}>{booking.check_out}</time></dd>
                  <dt>Guests</dt><dd>{booking.guests}</dd>
                  <dt>Status</dt><dd>{booking.status}</dd>
                  <dt>Booking reference</dt><dd>{booking.booking_id}</dd>
                </dl>
                {property ? <Link href={`/properties/${encodeURIComponent(booking.property_id)}`}>View property</Link>
                  : propertiesLoaded && <p>This property has been deleted. This booking is retained for your records.</p>}
                {(property || !propertiesLoaded) && <CancelBookingButton booking={booking} onCancelled={updated => {
                  setBookings(current => current.map(item => item.booking_id === updated.booking_id ? updated : item));
                  setNotice("Booking cancelled successfully.");
                }} />}
              </article>
            );
          })}
        </>}
      </>}
    </main>
  );
}
