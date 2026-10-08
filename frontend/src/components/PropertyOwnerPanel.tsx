"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, getPropertyBookings, getCurrentUser, getProperty } from "@/lib/api";
import type { Property } from "@/types/property";
import type { Booking } from "@/types/booking";
import PropertyEditForm from "@/components/PropertyEditForm";
import BookingEditForm from "@/components/BookingEditForm";
import CancelBookingButton from "@/components/CancelBookingButton";
import ConfirmBookingButton from "@/components/ConfirmBookingButton";
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
      <PropertyEditForm property={property} onSaved={updated => { setProperty(updated); router.refresh(); }} />
      <DeletePropertyButton property={property} />
      <h3>Bookings for this property</h3>
      {notice && <p role="status">{notice}</p>}
      {!error && bookings.length === 0 && <p>No bookings for this property yet.</p>}
      {bookings.map(booking => <article className="card" key={booking.booking_id}>
        <h4>{booking.guest_name}</h4>
        <p>{booking.guest_email}</p>
        <p>{booking.check_in} to {booking.check_out} · {booking.guests} guests</p>
        <p>Status: {booking.status}</p>
        <p>Booking reference: {booking.booking_id}</p>
        <BookingEditForm booking={booking} maxGuests={property.max_guests} onSaved={bookingSaved} />
        <ConfirmBookingButton booking={booking} onConfirmed={bookingSaved} />
        <CancelBookingButton booking={booking} onCancelled={bookingSaved} />
      </article>)}
    </>}
  </section>;
}
