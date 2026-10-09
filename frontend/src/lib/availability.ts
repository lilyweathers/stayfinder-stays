export type UnavailableRange = { check_in: string; check_out: string };
export type BookingDates = { checkIn: string; checkOut: string };

export function isCalendarDate(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day.startsWith("0000")) return false;
  const date = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === day;
}

export function isNightUnavailable(day: string, ranges: UnavailableRange[]) {
  return ranges.some(range => day >= range.check_in && day < range.check_out);
}

export function isStayAvailable(start: string, end: string, ranges: UnavailableRange[]) {
  return isCalendarDate(start) && isCalendarDate(end) && end > start && !ranges.some(range => start < range.check_out && end > range.check_in);
}

export function canSelectDate(day: string, field: "checkIn" | "checkOut", dates: BookingDates, ranges: UnavailableRange[], today: string) {
  if (day < today) return false;
  if (field === "checkIn") return !isNightUnavailable(day, ranges);
  // Checkout is exclusive: it may be the first occupied night of the next stay.
  return isStayAvailable(dates.checkIn, day, ranges);
}

export function calendarDays(month: string) {
  const [year, number] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, number - 1, 1));
  const count = new Date(Date.UTC(year, number, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7; // Monday first.
  return [...Array(offset).fill(null), ...Array.from({ length: count }, (_, index) =>
    `${month}-${String(index + 1).padStart(2, "0")}`)] as (string | null)[];
}

export function shiftMonth(month: string, delta: number) {
  const [year, number] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, number - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}
