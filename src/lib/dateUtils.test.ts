import { describe, expect, it } from "vitest";

import { isSameDay, isSameMonth, startOfDay, startOfMonth } from "@/lib/dateUtils";

describe("startOfDay", () => {
  it("zeroes the time components", () => {
    const result = startOfDay(new Date(2026, 7, 5, 14, 33, 12, 456));
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(7);
    expect(result.getDate()).toBe(5);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  it("does not mutate its argument", () => {
    const input = new Date(2026, 7, 5, 14, 33);
    startOfDay(input);
    expect(input.getHours()).toBe(14);
  });
});

describe("startOfMonth", () => {
  it("returns midnight on the first of the month", () => {
    const result = startOfMonth(new Date(2026, 7, 22, 9, 15));
    expect(result.getDate()).toBe(1);
    expect(result.getMonth()).toBe(7);
    expect(result.getHours()).toBe(0);
  });
});

describe("isSameDay", () => {
  it("is true for two times on the same calendar day", () => {
    expect(isSameDay(new Date(2026, 7, 5, 0, 1), new Date(2026, 7, 5, 23, 59))).toBe(true);
  });

  it("is false one millisecond across midnight", () => {
    expect(
      isSameDay(new Date(2026, 7, 5, 23, 59, 59, 999), new Date(2026, 7, 6, 0, 0, 0, 0))
    ).toBe(false);
  });

  it("is false for the same day number in different months", () => {
    expect(isSameDay(new Date(2026, 6, 5), new Date(2026, 7, 5))).toBe(false);
  });
});

describe("isSameMonth", () => {
  it("is true across the whole month", () => {
    expect(isSameMonth(new Date(2026, 7, 1), new Date(2026, 7, 31))).toBe(true);
  });

  it("is false for the same month in different years", () => {
    expect(isSameMonth(new Date(2025, 7, 5), new Date(2026, 7, 5))).toBe(false);
  });
});
