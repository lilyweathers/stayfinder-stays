"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, createBooking, getCurrentUser } from "@/lib/api";
import type { Property } from "@/types/property";

export default function BookingForm({ property }: { property: Property }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const draftKey = `stayfinder:booking-draft:${property.property_id}`;
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [created, setCreated] = useState(false);

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
      if (active && restoreFailed) setMessage("Could not restore your booking details. Please enter them again.");
    });
    return () => { active = false; };
  }, [draftKey]);

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
      try { sessionStorage.removeItem(draftKey); } catch { /* Booking already succeeded. */ }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setNeedsLogin(true);
        signIn(form);
        return;
      }
      setMessage(error instanceof Error ? error.message : "Could not create booking.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section>
      <h2>Book this stay</h2>
      {needsLogin && <p>Sign in before submitting a booking.</p>}
      <form ref={formRef} onSubmit={submit}>
        <label>Name<input name="guest_name" required autoComplete="name" /></label>
        <label>Email<input name="guest_email" type="email" required autoComplete="email" /></label>
        <label>Check-in<input name="check_in" type="date" required /></label>
        <label>Check-out<input name="check_out" type="date" required /></label>
        <label>Guests<input name="guests" type="number" min={1} max={property.max_guests} defaultValue={1} required /></label>
        <button
          type={needsLogin ? "button" : "submit"}
          onClick={needsLogin ? () => signIn(formRef.current) : undefined}
          disabled={pending}
        >{pending ? "Booking…" : needsLogin ? "Sign in" : "Create booking"}</button>
      </form>
      <p role="status">{message}</p>
      {created && <Link href="/bookings">View your bookings</Link>}
    </section>
  );
}
