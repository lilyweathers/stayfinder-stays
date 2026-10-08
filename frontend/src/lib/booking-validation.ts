export interface BookingFormValues {
  guest_name: string;
  guest_email: string;
  check_in: string;
  check_out: string;
  guests: number;
}

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const date = new Date(value + "T00:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateBookingForm(values: BookingFormValues, maxGuests: number): string[] {
  const errors: string[] = [];
  if (!values.guest_name.trim()) errors.push("Enter the guest's name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.guest_email.trim())) errors.push("Enter a valid guest email address.");
  const checkInValid = isCalendarDate(values.check_in);
  const checkOutValid = isCalendarDate(values.check_out);
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm",
    year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  if (checkInValid && values.check_in < today) errors.push("Check-in cannot be in the past.");
  if (!checkInValid) errors.push("Choose a valid check-in date.");
  if (!checkOutValid) errors.push("Choose a valid check-out date.");
  if (checkInValid && checkOutValid && values.check_out <= values.check_in) errors.push("Check-out must be after check-in.");
  if (!Number.isSafeInteger(values.guests) || values.guests < 1) errors.push("Guest count must be a whole number of at least 1.");
  else if (values.guests > maxGuests) errors.push(
    "This property allows up to " + maxGuests + " " + (maxGuests === 1 ? "guest." : "guests.")
  );
  return errors;
}

export function calculateBookingPreview(checkIn: string, checkOut: string, pricePerNight: number) {
  if (!isCalendarDate(checkIn) || !isCalendarDate(checkOut)
    || checkOut <= checkIn || !Number.isFinite(pricePerNight) || pricePerNight < 0) return null;
  // Calendar nights use UTC so daylight-saving changes do not add or remove a night.
  const nights = (Date.parse(checkOut + "T00:00:00Z") - Date.parse(checkIn + "T00:00:00Z")) / 86_400_000;
  const total = Math.round((nights * pricePerNight + Number.EPSILON) * 100) / 100;
  if (!Number.isFinite(total)) return null;
  return { nights, total };
}
