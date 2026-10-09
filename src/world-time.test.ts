import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { CalendarDef } from "./types.js";
import { formatDuration, formatWorldDate, fromWorldTime, minutesBetween, toWorldTime } from "./world-time.js";

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

describe("formatDuration", () => {
  it("zero minutes", () => {
    expect(formatDuration(0, cal)).toBe("0 min");
  });

  it("minutes only", () => {
    expect(formatDuration(45, cal)).toBe("45 min");
  });

  it("exactly one hour", () => {
    expect(formatDuration(60, cal)).toBe("1 hour");
  });

  it("hours and minutes", () => {
    expect(formatDuration(90, cal)).toBe("1 hour 30 min");
  });

  it("plural hours", () => {
    expect(formatDuration(6 * 60, cal)).toBe("6 hours");
  });

  it("exactly one day", () => {
    expect(formatDuration(1440, cal)).toBe("1 day 0 hours");
  });

  it("one day one hour", () => {
    expect(formatDuration(1440 + 60, cal)).toBe("1 day 1 hour");
  });

  it("plural days", () => {
    expect(formatDuration(2 * 1440, cal)).toBe("2 days 0 hours");
  });

  it("days, hours and minutes", () => {
    expect(formatDuration(3 * 1440 + 6 * 60 + 30, cal)).toBe("3 days 6 hours 30 min");
  });

  it("respects fantasy day length (8-hour days)", () => {
    const shortDayCal: CalendarDef = {
      monthNames: ["One"],
      daysPerMonth: [30],
      minutesPerDay: 8 * 60, // 480 min/day
    };
    // 480 min = 1 day, remainder = 0
    expect(formatDuration(480, shortDayCal)).toBe("1 day 0 hours");
    // 600 min = 1 day + 2 hours
    expect(formatDuration(600, shortDayCal)).toBe("1 day 2 hours");
  });
});

describe("world-time property tests", () => {
  const validDate = fc.record({
    year: fc.integer({ min: 0, max: 99 }),
    month: fc.integer({ min: 1, max: 4 }),
    day: fc.integer({ min: 1, max: 30 }),
    hour: fc.integer({ min: 0, max: 23 }),
    minute: fc.integer({ min: 0, max: 59 }),
  });

  it("toWorldTime then fromWorldTime is identity", () => {
    fc.assert(
      fc.property(validDate, (date) => {
        expect(fromWorldTime(toWorldTime(date, cal), cal)).toEqual(date);
      }),
    );
  });

  it("toWorldTime is monotone: later dates produce larger world times", () => {
    const pairArb = fc.tuple(
      fc.integer({ min: 0, max: 47 }),
      fc.integer({ min: 1, max: 47 }),
    ).map(([a, b]) => [Math.min(a, b), Math.max(a, b)] as [number, number])
      .filter(([a, b]) => a < b);

    fc.assert(
      fc.property(pairArb, ([yearA, yearB]) => {
        const a = { year: yearA, month: 1, day: 1, hour: 0, minute: 0 };
        const b = { year: yearB, month: 1, day: 1, hour: 0, minute: 0 };
        expect(toWorldTime(a, cal)).toBeLessThan(toWorldTime(b, cal));
      }),
    );
  });

  it("minutesBetween is commutative", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100_000 }),
        fc.integer({ min: 0, max: 100_000 }),
        (a, b) => {
          expect(minutesBetween(a, b)).toBe(minutesBetween(b, a));
        },
      ),
    );
  });

  it("formatDuration(0) always yields '0 min'", () => {
    const anyCal: fc.Arbitrary<CalendarDef> = fc.record({
      monthNames: fc.array(fc.string({ minLength: 1, maxLength: 8 }), { minLength: 1, maxLength: 6 }),
      daysPerMonth: fc.array(fc.integer({ min: 1, max: 30 }), { minLength: 1, maxLength: 6 }),
      minutesPerDay: fc.integer({ min: 60, max: 2880 }),
    }).filter((c) => c.monthNames.length === c.daysPerMonth.length);

    fc.assert(
      fc.property(anyCal, (c) => {
        expect(formatDuration(0, c)).toBe("0 min");
      }),
    );
  });
});
