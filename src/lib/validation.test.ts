import { describe, expect, it } from "vitest";

import { validateGstNumber } from "@/lib/validation";

describe("validateGstNumber", () => {
  it("accepts a well-formed 15-character GSTIN", () => {
    expect(validateGstNumber("29ABCDE1234F1Z5")).toBe(true);
  });

  it("accepts lowercase input", () => {
    expect(validateGstNumber("29abcde1234f1z5")).toBe(true);
  });

  it("tolerates surrounding whitespace", () => {
    expect(validateGstNumber("  29ABCDE1234F1Z5  ")).toBe(true);
  });

  it("rejects the wrong length", () => {
    expect(validateGstNumber("29ABCDE1234F1Z")).toBe(false);
  });

  it("rejects a non-numeric state code", () => {
    expect(validateGstNumber("2XABCDE1234F1Z5")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(validateGstNumber("")).toBe(false);
  });
});
