"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, createBooking, getCurrentUser } from "@/lib/api";
import { calculateBookingPreview, validateBookingForm } from "@/lib/booking-validation";
import type { Property } from "@/types/property";

export default function BookingForm({ property }: { property: Property }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const draftKey = `stayfinder:booking-draft:${property.property_id}`;
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [created, setCreated] = useState(false);
  const [preview, setPreview] = useState<ReturnType<typeof calculateBookingPreview>>(null);
  const formatPrice = (price: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(price);
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm",
    year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  useEffect(() => {
    let active = true;
    let restoreFailed = false;
    try {
      const saved = sessionStorage.getItem(draftKey);
      if (saved) {
        const draft = JSON.parse(saved);
        for (const name of ["guest_name", "guest_email", "check_in", "check_out", "guests"]) {
          const input = formRef.current?.elements.namedItem(name);
          if (input instanceof HTMLInputElement && typeof draft?.[name] === "string") {
            input.value = draft[name];
          }
        }
      }
    } catch {
      restoreFailed = true;
    }
    getCurrentUser().then(() => {
      if (active) setNeedsLogin(false);
    }).catch(error => {
      if (active) setNeedsLogin(error instanceof ApiError && error.status === 401);
    }).finally(() => {
      if (active) {
        const form = formRef.current;
        if (form) {
          const data = new FormData(form);
          setPreview(calculateBookingPreview(String(data.get("check_in") || ""), String(data.get("check_out") || ""), property.price_per_night));
        }
      }
      if (active && restoreFailed) setMessage("Could not restore your booking details. Please enter them again.");
    });
    return () => { active = false; };
  }, [draftKey, property.price_per_night]);

  function updatePreview() {
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    setPreview(calculateBookingPreview(String(data.get("check_in") || ""), String(data.get("check_out") || ""), property.price_per_night));
  }

  function signIn(form: HTMLFormElement | null) {
    if (!form) return;
    try {
      const data = new FormData(form);
      sessionStorage.setItem(draftKey, JSON.stringify(Object.fromEntries(data.entries())));
      const returnTo = `/properties/${encodeURIComponent(property.property_id)}`;
      router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    } catch {
      setMessage("Could not save your booking details. Please allow browser storage and try again.");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const checkIn = String(data.get("check_in"));
    const checkOut = String(data.get("check_out"));
    if (needsLogin) {
      signIn(form);
      return;
    }
    setNeedsLogin(false);
    setCreated(false);
    setMessage("");
    const values = {
      guest_name: String(data.get("guest_name") || "").trim(),
      guest_email: String(data.get("guest_email") || "").trim(),
      check_in: checkIn, check_out: checkOut,
      guests: Number(data.get("guests")),
    };
    const validationErrors = validateBookingForm(values, property.max_guests);
    setErrors(validationErrors);
    if (validationErrors.length) return;
    setPending(true);
    setMessage("");
    try {
      await createBooking({
        property_id: property.property_id,
        ...values,
      });
      setMessage("Your booking was created.");
      setCreated(true);
      form.reset();
      setPreview(null);
      try { sessionStorage.removeItem(draftKey); } catch { /* Booking already succeeded. */ }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setNeedsLogin(true);
        signIn(form);
        return;
      }
      setErrors([error instanceof Error ? error.message : "Could not create booking."]);
    } finally {
      setPending(false);
    }
  }

  return (
    <section>
      <h2>Book this stay</h2>
      {needsLogin && <p>Sign in before submitting a booking.</p>}
      <form ref={formRef} onSubmit={submit} onChange={updatePreview} noValidate>
        <label>Name<input name="guest_name" required autoComplete="name" /></label>
        <label>Email<input name="guest_email" type="email" required autoComplete="email" /></label>
        <label>Check-in<input name="check_in" type="date" min={today} required /></label>
        <label>Check-out<input name="check_out" type="date" min={today} required /></label>
        <label>Guests<input name="guests" type="number" min={1} max={property.max_guests} step={1} defaultValue={1} required /></label>
        <div aria-live="polite" aria-atomic="true">
          {preview ? <>
            <p>{preview.nights} {preview.nights === 1 ? "night" : "nights"} × {formatPrice(property.price_per_night)} per night</p>
            <p><strong>Estimated total: {formatPrice(preview.total)}</strong></p>
          </> : <p>Choose check-in and check-out dates to see nights and total price.</p>}
        </div>
        <button
          type={needsLogin ? "button" : "submit"}
          onClick={needsLogin ? () => signIn(formRef.current) : undefined}
          disabled={pending}
        >{pending ? "Booking…" : needsLogin ? "Sign in" : "Create booking"}</button>
      </form>
      {errors.length > 0 && <div role="alert"><p>Please correct the booking details:</p>
        <ul>{errors.map(error => <li key={error}>{error}</li>)}</ul>
      </div>}
      <p role="status">{message}</p>
      {created && <Link href="/bookings">View your bookings</Link>}
    </section>
  );
}
