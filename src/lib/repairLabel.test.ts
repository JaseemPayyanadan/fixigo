import { describe, expect, it } from "vitest";

import { formatRepairLabel, shortServiceRef } from "@/lib/repairLabel";

describe("shortServiceRef", () => {
  it("returns the last eight characters of the service id", () => {
    expect(shortServiceRef("abcdefghijklmnop")).toBe("ijklmnop");
  });

  it("returns the full id when shorter than eight characters", () => {
    expect(shortServiceRef("abc")).toBe("abc");
  });
});

describe("formatRepairLabel", () => {
  it("prefers a stored serviceRef when present", () => {
    expect(formatRepairLabel("abcdefghijklmnop", "custom-ref")).toBe("Repair #custom-ref");
  });

  it("falls back to the short service id when serviceRef is missing", () => {
    expect(formatRepairLabel("abcdefghijklmnop")).toBe("Repair #ijklmnop");
  });

  it("falls back when serviceRef is blank", () => {
    expect(formatRepairLabel("abcdefghijklmnop", "   ")).toBe("Repair #ijklmnop");
  });
});
