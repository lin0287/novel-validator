import { describe, expect, it } from "vitest";
import type { CalendarDef } from "./types.js";
import { formatWorldDate, fromWorldTime, minutesBetween, toWorldTime } from "./world-time.js";

const cal: CalendarDef = {
  monthNames: ["Frost", "Thaw", "Bloom", "Harvest"],
  daysPerMonth: [30, 30, 30, 30],
  minutesPerDay: 24 * 60,
};

describe("toWorldTime / fromWorldTime round-trip", () => {
  it("epoch is zero", () => {
    expect(toWorldTime({ year: 0, month: 1, day: 1, hour: 0, minute: 0 }, cal)).toBe(0);
  });

  it("first minute of year 1", () => {
    const year1Start = 120 * 24 * 60; // 4 months × 30 days × 1440 min
    expect(toWorldTime({ year: 1, month: 1, day: 1, hour: 0, minute: 0 }, cal)).toBe(year1Start);
  });

  it("mid-year date encodes and decodes", () => {
    const date = { year: 2, month: 3, day: 15, hour: 14, minute: 30 };
    const wt = toWorldTime(date, cal);
    expect(fromWorldTime(wt, cal)).toEqual(date);
  });

  it("round-trips across many values", () => {
    const dates = [
      { year: 0, month: 1, day: 1, hour: 0, minute: 0 },
      { year: 0, month: 2, day: 5, hour: 8, minute: 15 },
      { year: 3, month: 4, day: 30, hour: 23, minute: 59 },
      { year: 10, month: 1, day: 1, hour: 12, minute: 0 },
    ];
    for (const d of dates) {
      expect(fromWorldTime(toWorldTime(d, cal), cal)).toEqual(d);
    }
  });
});

describe("fromWorldTime", () => {
  it("day 1 of month 2 is correct", () => {
    const wt = 30 * 24 * 60; // 30 days into year 0
    expect(fromWorldTime(wt, cal)).toEqual({ year: 0, month: 2, day: 1, hour: 0, minute: 0 });
  });

  it("extracts hours and minutes correctly", () => {
    const wt = 2 * 60 + 45; // 2 hours 45 minutes from epoch
    expect(fromWorldTime(wt, cal)).toEqual({ year: 0, month: 1, day: 1, hour: 2, minute: 45 });
  });
});

describe("formatWorldDate", () => {
  it("formats with month name and zero-padded time", () => {
    const wt = toWorldTime({ year: 1, month: 2, day: 8, hour: 9, minute: 5 }, cal);
    expect(formatWorldDate(fromWorldTime(wt, cal), cal)).toBe("Year 1, 8 Thaw, 09:05");
  });
});

describe("minutesBetween", () => {
  it("returns absolute difference", () => {
    expect(minutesBetween(100, 250)).toBe(150);
    expect(minutesBetween(250, 100)).toBe(150);
  });

  it("returns zero for equal times", () => {
    expect(minutesBetween(500, 500)).toBe(0);
  });
});
