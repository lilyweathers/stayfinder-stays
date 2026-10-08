"use client";

import Link from "next/link";
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
      <h1>Bookings</h1>
      <p>View bookings you have made. Manage guest bookings for your properties under My Properties.</p>
      {notice && <p role="status">{notice}</p>}
      {loading && <p role="status">Loading bookings...</p>}
      {error && <p role="alert">{error}</p>}
      {needsLogin ? <Link href="/login">Sign in</Link> : !loading && (
        <button type="button" onClick={retry}>{error ? "Try again" : "Refresh bookings"}</button>
      )}
      {!loading && !error && <>
        {warning && <p role="status">{warning}</p>}
        {bookings.length === 0 ? (
          <p>No bookings to show yet. <Link href="/properties">Browse properties</Link></p>
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
              <article className="card" key={booking.booking_id}>
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
