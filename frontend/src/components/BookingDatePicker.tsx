"use client";

import { useId, useState } from "react";
import { calendarDays, canSelectDate, isCalendarDate, isStayAvailable, shiftMonth, type BookingDates, type UnavailableRange } from "@/lib/availability";

export default function BookingDatePicker({ dates, onChange, ranges, today, disabled }: {
  dates: BookingDates; onChange: (dates: BookingDates) => void;
  ranges: UnavailableRange[]; today: string; disabled: boolean;
}) {
  const id = useId();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [field, setField] = useState<"checkIn" | "checkOut">("checkIn");
  const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
  const formatDate = (day: string) => isCalendarDate(day) ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`)) : "Choose a date";
  function choose(day: string) {
    if (field === "checkIn") {
      onChange({ checkIn: day, checkOut: isStayAvailable(day, dates.checkOut, ranges) ? dates.checkOut : "" });
      setField("checkOut");
    } else onChange({ ...dates, checkOut: day });
  }
  return <fieldset className="booking-calendar" disabled={disabled} aria-describedby={`${id}-help`}>
    <legend>Stay dates</legend>
    <div className="calendar-fields">
      <button type="button" aria-pressed={field === "checkIn"} onClick={() => { setField("checkIn"); if (isCalendarDate(dates.checkIn)) setMonth(dates.checkIn.slice(0, 7)); }}>
        <span>Check-in</span><strong>{dates.checkIn ? formatDate(dates.checkIn) : "Choose a date"}</strong>
      </button>
      <button type="button" aria-pressed={field === "checkOut"} disabled={!isCalendarDate(dates.checkIn)} onClick={() => { setField("checkOut"); setMonth((isCalendarDate(dates.checkOut) ? dates.checkOut : dates.checkIn).slice(0, 7)); }}>
        <span>Check-out</span><strong>{dates.checkOut ? formatDate(dates.checkOut) : "Choose a date"}</strong>
      </button>
    </div>
    <div className="calendar-heading">
      <button type="button" aria-label="Previous month" disabled={month <= today.slice(0, 7)} onClick={() => setMonth(shiftMonth(month, -1))}>‹</button>
      <strong aria-live="polite">{monthLabel}</strong>
      <button type="button" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}>›</button>
    </div>
    <p className="calendar-prompt" aria-live="polite">Choose your {field === "checkIn" ? "check-in" : "check-out"} date</p>
    <div className="calendar-grid" role="group" aria-label={`${monthLabel} ${field === "checkIn" ? "check-in" : "check-out"} dates`}>
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => <span className="calendar-weekday" key={day}>{day}</span>)}
      {calendarDays(month).map((day, index) => day ? <button
        key={day} type="button" disabled={!canSelectDate(day, field, dates, ranges, today)}
        aria-label={formatDate(day)} aria-pressed={day === dates.checkIn || day === dates.checkOut}
        aria-current={day === today ? "date" : undefined}
        className={day === dates.checkIn || day === dates.checkOut ? "calendar-selected" : dates.checkIn && dates.checkOut && day > dates.checkIn && day < dates.checkOut ? "calendar-in-stay" : ""}
        onClick={() => choose(day)}
      >{Number(day.slice(-2))}</button> : <span key={`empty-${index}`} />)}
    </div>
    <p id={`${id}-help`} className="calendar-help">Grey dates are unavailable. You can check out on the day another stay begins.</p>
    {(dates.checkIn || dates.checkOut) && <button type="button" className="calendar-clear" onClick={() => { onChange({ checkIn: "", checkOut: "" }); setField("checkIn"); }}>Clear dates</button>}
  </fieldset>;
}
