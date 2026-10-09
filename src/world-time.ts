import type { CalendarDef, WorldTime } from "./types.js";

export interface WorldDate {
  year: number;
  /** 1-based month index. */
  month: number;
  /** 1-based day. */
  day: number;
  hour: number;
  minute: number;
}

/** Total minutes in one full year according to the calendar. */
function minutesPerYear(cal: CalendarDef): number {
  const daysPerYear = cal.daysPerMonth.reduce((a, b) => a + b, 0);
  return daysPerYear * cal.minutesPerDay;
}

/** Convert world time (minutes) to a structured date. */
export function fromWorldTime(wt: WorldTime, cal: CalendarDef): WorldDate {
  const mpd = cal.minutesPerDay;
  const mpy = minutesPerYear(cal);

  let remaining = wt;
  const year = Math.floor(remaining / mpy);
  remaining -= year * mpy;

  let month = 0;
  for (let i = 0; i < cal.daysPerMonth.length; i++) {
    const monthMinutes = (cal.daysPerMonth[i] ?? 0) * mpd;
    if (remaining < monthMinutes) {
      month = i;
      break;
    }
    remaining -= monthMinutes;
    // If we exhaust all months, clamp to last (shouldn't happen with valid input)
    if (i === cal.daysPerMonth.length - 1) {
      month = i;
    }
  }

  const day = Math.floor(remaining / mpd);
  remaining -= day * mpd;
  const hour = Math.floor(remaining / 60);
  const minute = remaining % 60;

  return { year, month: month + 1, day: day + 1, hour, minute };
}

/** Convert a structured date to world time (minutes). */
export function toWorldTime(date: WorldDate, cal: CalendarDef): WorldTime {
  const mpd = cal.minutesPerDay;
  const mpy = minutesPerYear(cal);

  let wt = date.year * mpy;

  for (let i = 0; i < date.month - 1; i++) {
    wt += (cal.daysPerMonth[i] ?? 0) * mpd;
  }

  wt += (date.day - 1) * mpd;
  wt += date.hour * 60;
  wt += date.minute;

  return wt;
}

/** Format a WorldDate to a human-readable string using the calendar's month names. */
export function formatWorldDate(date: WorldDate, cal: CalendarDef): string {
  const monthName = cal.monthNames[date.month - 1] ?? `Month${date.month}`;
  const hh = String(date.hour).padStart(2, "0");
  const mm = String(date.minute).padStart(2, "0");
  return `Year ${date.year}, ${date.day} ${monthName}, ${hh}:${mm}`;
}

/** Return the difference in minutes between two world times, always positive. */
export function minutesBetween(a: WorldTime, b: WorldTime): number {
  return Math.abs(b - a);
}

/**
 * Format a duration in minutes as a human-readable string, using the calendar's
 * minutesPerDay so fantasy day lengths work correctly.
 * Examples: "6 hours", "2 days 6 hours", "1 day 0 hours 30 min"
 */
export function formatDuration(minutes: number, cal: CalendarDef): string {
  const mpd = cal.minutesPerDay;
  const days = Math.floor(minutes / mpd);
  const remainder = minutes % mpd;
  const hours = Math.floor(remainder / 60);
  const mins = remainder % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
  if (hours > 0 || days > 0) parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins} min`);
  return parts.join(" ");
}
