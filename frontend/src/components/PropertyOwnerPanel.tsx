"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, getPropertyBookings, getCurrentUser, getProperty } from "@/lib/api";
import type { Property } from "@/types/property";
import type { Booking } from "@/types/booking";
import PropertyImage from "@/components/PropertyImage";
import PropertyEditForm from "@/components/PropertyEditForm";
import BookingEditForm from "@/components/BookingEditForm";
import CancelBookingButton from "@/components/CancelBookingButton";
import ConfirmBookingButton from "@/components/ConfirmBookingButton";
import DeleteBookingButton from "@/components/DeleteBookingButton";
import DeletePropertyButton from "@/components/DeletePropertyButton";

export default function PropertyOwnerPanel({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { user } = await getCurrentUser();
        const currentProperty = await getProperty(propertyId);
        if (!active) return;
        if (currentProperty.owner_id !== user.id) { setIsOwner(false); setError("You do not own this property."); return; }
        setProperty(currentProperty);
        setIsOwner(true);
        const rows = await getPropertyBookings(propertyId);
        if (active) setBookings(rows.filter(booking => booking.property_id === propertyId));
      } catch (error) {
        if (active) {
          setIsOwner(false);
          setError(error instanceof ApiError && error.status === 401 ? "Sign in to manage your properties." : "Could not load owner controls or bookings. Please try again.");
        }
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [propertyId, attempt]);

  function bookingSaved(updated: Booking) {
    setBookings(current => current.map(item => item.booking_id === updated.booking_id ? updated : item));
    setNotice(updated.status === "cancelled" ? "Booking cancelled." : updated.status === "confirmed" ? "Booking confirmed or updated." : "Booking saved.");
  }
  const formatDate = (value: string) => {
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-GB", {
      day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
    }).format(date);
  };
  const pendingCount = bookings.filter(booking => booking.status === "pending").length;

  if (loading) return <p role="status">Checking property management access…</p>;
  if (!isOwner && !error) return null;
  return <section className="owner-panel" aria-labelledby="owner-heading">
    <h2 id="owner-heading">Manage this property</h2>
    {error && <><p role="alert">{error}</p><button type="button" onClick={() => {
      setError(""); setLoading(true); setIsOwner(false); setBookings([]); setAttempt(value => value + 1);
    }}>Try again</button></>}
    {isOwner && property && <>
      <h2>{property.title}</h2>
      <p>{property.location}</p>
      <PropertyImage src={property.image_url} title={property.title} detail />
      <PropertyEditForm property={property} onSaved={updated => { setProperty(updated); router.refresh(); }} />
      <DeletePropertyButton property={property} />
      <div className="host-bookings-heading"><div><h3>Bookings for this property</h3><p>Review guest requests and manage upcoming stays.</p></div>
        {pendingCount > 0 && <span className="confirmation-status">{pendingCount} awaiting confirmation</span>}
      </div>
      {notice && <p role="status">{notice}</p>}
      {!error && bookings.length === 0 && <div className="host-bookings-empty"><h4>Your next guests will appear here</h4><p>No bookings yet. Once a guest requests a stay, you can review and manage it here.</p></div>}
      {bookings.map(booking => <article className="host-booking-card" key={booking.booking_id}>
        <div className="host-booking-header">
          <div className="host-booking-guest"><span className="host-guest-avatar" aria-hidden="true">{booking.guest_name.trim().slice(0, 1).toUpperCase() || "G"}</span>
            <div><h4>{booking.guest_name}</h4><p>{booking.guest_email}</p></div></div>
          <span className={`confirmation-status confirmation-status-${booking.status}`}>{booking.status === "pending" ? "Awaiting confirmation" : booking.status === "confirmed" ? "Confirmed" : "Cancelled"}</span>
        </div>
        <dl className="stay-booking-dates">
          <div><dt>Check-in</dt><dd><time dateTime={booking.check_in}>{formatDate(booking.check_in)}</time></dd></div>
          <div><dt>Check-out</dt><dd><time dateTime={booking.check_out}>{formatDate(booking.check_out)}</time></dd></div>
          <div><dt>Guests</dt><dd>{booking.guests} {booking.guests === 1 ? "guest" : "guests"}</dd></div>
        </dl>
        <div className="host-booking-controls">
          <BookingEditForm booking={booking} maxGuests={property.max_guests} onSaved={bookingSaved} />
          <ConfirmBookingButton booking={booking} onConfirmed={bookingSaved} />
          <CancelBookingButton booking={booking} onCancelled={bookingSaved} />
          <DeleteBookingButton booking={booking} onDeleted={id => {
            setBookings(current => current.filter(item => item.booking_id !== id));
            setNotice("Booking deleted.");
          }} />
        </div>
        <div className="host-booking-record"><details className="stay-booking-record"><summary>Booking reference</summary><p>{booking.booking_id}</p></details>
          <Link className="stay-summary-link" href={`/bookings/${encodeURIComponent(booking.booking_id)}/created`}>View summary <span aria-hidden="true">→</span></Link></div>
      </article>)}
    </>}
  </section>;
}
