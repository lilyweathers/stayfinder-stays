// Booking dates are calendar dates in Sweden, independent of the server timezone.
export function bookingToday(instant: Date = new Date()): string {
  // Vg5: Dagens datum följer svensk tidszon oavsett var servern körs.
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(instant);
}
