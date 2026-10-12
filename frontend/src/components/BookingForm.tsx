"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, createBooking, getCurrentUser, getPropertyAvailability } from "@/lib/api";
import BookingDatePicker from "@/components/BookingDatePicker";
import { isStayAvailable, type BookingDates, type UnavailableRange } from "@/lib/availability";
import { calculateBookingPreview, validateBookingForm } from "@/lib/booking-validation";
import type { Property } from "@/types/property";

export default function BookingForm({ property }: { property: Property }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const datesTouched = useRef(false);
  const draftKey = `stayfinder:booking-draft:${property.property_id}`;
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [createdId, setCreatedId] = useState("");
  const submitting = useRef(false);
  const [dates, setDates] = useState<BookingDates>({ checkIn: "", checkOut: "" });
  const [availabilityVersion, setAvailabilityVersion] = useState(0);
  const [availability, setAvailability] = useState<{ propertyId: string; version: number; ranges: UnavailableRange[]; error: string } | null>(null);
  const availabilityLoading = !availability || availability.propertyId !== property.property_id || availability.version !== availabilityVersion;
  const unavailableRanges = availability?.ranges || [];
  const availabilityError = availabilityLoading ? "" : availability?.error || "";
  const datesUnavailable = !!dates.checkIn && !!dates.checkOut && !availabilityLoading && !availabilityError
    && !isStayAvailable(dates.checkIn, dates.checkOut, unavailableRanges);
  const [preview, setPreview] = useState<ReturnType<typeof calculateBookingPreview>>(null);
  const formatPrice = (price: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(price);
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm",
    year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  useEffect(() => {
    let active = true;
    let sequence = 0;
    function load() {
      const request = ++sequence;
      getPropertyAvailability(property.property_id).then(ranges => {
        if (active && request === sequence) setAvailability({ propertyId: property.property_id, version: availabilityVersion, ranges, error: "" });
      }).catch(() => {
        if (active && request === sequence) setAvailability({ propertyId: property.property_id, version: availabilityVersion, ranges: [], error: "Could not load available dates. Please try again." });
      });
    }
    load();
    const interval = window.setInterval(load, 60_000);
    window.addEventListener("focus", load);
    return () => { active = false; window.clearInterval(interval); window.removeEventListener("focus", load); };
  }, [property.property_id, availabilityVersion]);

  useEffect(() => {
    let active = true;
    let restoreFailed = false;
    let hasDraft = false;
    let restoredDates: BookingDates = { checkIn: "", checkOut: "" };
    try {
      const saved = sessionStorage.getItem(draftKey);
      if (saved) {
        hasDraft = true;
        const draft = JSON.parse(saved);
        restoredDates = { checkIn: typeof draft.check_in === "string" ? draft.check_in : "", checkOut: typeof draft.check_out === "string" ? draft.check_out : "" };
        for (const name of ["guest_name", "guest_email", "guests"]) {
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
        if (hasDraft && !datesTouched.current) {
          setDates(restoredDates);
          setPreview(calculateBookingPreview(restoredDates.checkIn, restoredDates.checkOut, property.price_per_night));
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

  function chooseDates(value: BookingDates) {
    datesTouched.current = true;
    setDates(value);
    setPreview(calculateBookingPreview(value.checkIn, value.checkOut, property.price_per_night));
    setErrors([]);
    setMessage("");
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
    if (submitting.current || createdId) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const checkIn = String(data.get("check_in"));
    const checkOut = String(data.get("check_out"));
    if (needsLogin) {
      signIn(form);
      return;
    }
    setNeedsLogin(false);
    setMessage("");
    const values = {
      guest_name: String(data.get("guest_name") || "").trim(),
      guest_email: String(data.get("guest_email") || "").trim(),
      check_in: checkIn, check_out: checkOut,
      guests: Number(data.get("guests")),
    };
    const validationErrors = validateBookingForm(values, property.max_guests);
    if (availabilityLoading || availabilityError) validationErrors.push("Wait for available dates to load before booking.");
    else if (checkIn && checkOut && !isStayAvailable(checkIn, checkOut, unavailableRanges)) validationErrors.push("These dates are unavailable. Choose a different stay.");
    setErrors(validationErrors);
    if (validationErrors.length) return;
    submitting.current = true;
    setPending(true);
    setMessage("");
    try {
      const booking = await createBooking({
        property_id: property.property_id,
        ...values,
      });
      setCreatedId(booking.booking_id);
      setMessage("Your booking was created. Opening your booking summary…");
      try { sessionStorage.removeItem(draftKey); } catch { /* Booking already succeeded. */ }
      router.replace(`/bookings/${encodeURIComponent(booking.booking_id)}/created`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) setAvailabilityVersion(version => version + 1);
      // Vg2: Vid 409 hämtas tillgängligheten igen eftersom någon kan ha bokat
      // sedan kalendern laddades. setErrors nedan visar backendens felmeddelande.
      if (error instanceof ApiError && error.status === 401) {
        setNeedsLogin(true);
        signIn(form);
        return;
      }
      setErrors([error instanceof Error ? error.message : "Could not create booking."]);
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  if (createdId) return <section aria-live="polite">
    <h2>Your booking is created</h2>
    <p>Opening your booking summary…</p>
    <Link href={`/bookings/${encodeURIComponent(createdId)}/created`}>View your booking summary</Link>
  </section>;

  return (
    <section>
      <h2>Book this stay</h2>
      {needsLogin && <p>Sign in before submitting a booking.</p>}
      <form ref={formRef} onSubmit={submit} onChange={updatePreview} noValidate>
        <label>Name<input name="guest_name" required autoComplete="name" /></label>
        <label>Email<input name="guest_email" type="email" required autoComplete="email" /></label>
        <input type="hidden" name="check_in" value={dates.checkIn} />
        <input type="hidden" name="check_out" value={dates.checkOut} />
        <BookingDatePicker dates={dates} onChange={chooseDates} ranges={unavailableRanges} today={today} disabled={pending || !!createdId || availabilityLoading || !!availabilityError} />
        {availabilityLoading && <p role="status">Loading available dates…</p>}
        {availabilityError && <div role="alert"><p>{availabilityError}</p><button type="button" onClick={() => setAvailabilityVersion(version => version + 1)}>Retry available dates</button></div>}
        {datesUnavailable && <p role="alert">Your selected dates are no longer available. Choose a different stay.</p>}
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
          disabled={pending || !!createdId || availabilityLoading || !!availabilityError || datesUnavailable}
        >{createdId ? "Opening booking…" : pending ? "Booking…" : needsLogin ? "Sign in" : "Create booking"}</button>
      </form>
      {errors.length > 0 && <div role="alert"><p>Please correct the booking details:</p>
        <ul>{errors.map(error => <li key={error}>{error}</li>)}</ul>
      </div>}
      <p role="status">{message}</p>
    </section>
  );
}
