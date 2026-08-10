import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/apiAuth";
import {
  parseCreatePurchaseRequestInput,
  parsePurchaseRequestAction,
  parseRejectPurchaseRequestInput,
} from "@/lib/purchaseRequestValidation";

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    serviceId: "service-1",
    items: [{ name: "Display", brand: "Samsung", model: "A34", quantity: 2, remarks: "cracked" }],
    ...overrides,
  };
}

describe("parseCreatePurchaseRequestInput", () => {
  it("parses a valid body", () => {
    const input = parseCreatePurchaseRequestInput(validBody());
    expect(input.serviceId).toBe("service-1");
    expect(input.items).toEqual([
      { name: "Display", brand: "Samsung", model: "A34", quantity: 2, remarks: "cracked" },
    ]);
  });

  it("trims and drops empty optional fields", () => {
    const input = parseCreatePurchaseRequestInput(
      validBody({ items: [{ name: " Battery ", brand: "", quantity: 1 }] })
    );
    expect(input.items[0]).toEqual({ name: "Battery", quantity: 1 });
  });

  it("rejects a missing serviceId", () => {
    const { serviceId: _drop, ...rest } = validBody();
    expect(() => parseCreatePurchaseRequestInput(rest)).toThrow(ApiError);
  });

  it("rejects an empty items array", () => {
    expect(() => parseCreatePurchaseRequestInput(validBody({ items: [] }))).toThrow(
      /at least one item/i
    );
  });

  it("rejects an item with no name", () => {
    expect(() =>
      parseCreatePurchaseRequestInput(validBody({ items: [{ quantity: 1 }] }))
    ).toThrow(/name is required/i);
  });

  it("rejects a non-integer quantity", () => {
    expect(() =>
      parseCreatePurchaseRequestInput(validBody({ items: [{ name: "x", quantity: 1.5 }] }))
    ).toThrow(/whole number/i);
  });

  it("rejects a quantity below 1", () => {
    expect(() =>
      parseCreatePurchaseRequestInput(validBody({ items: [{ name: "x", quantity: 0 }] }))
    ).toThrow(/at least 1/i);
  });
});

describe("parseRejectPurchaseRequestInput", () => {
  it("trims and returns the reason", () => {
    expect(parseRejectPurchaseRequestInput({ reason: "  no stock  " })).toEqual({
      reason: "no stock",
    });
  });

  it("rejects an empty reason", () => {
    expect(() => parseRejectPurchaseRequestInput({ reason: "  " })).toThrow(ApiError);
  });

  it("rejects a missing reason", () => {
    expect(() => parseRejectPurchaseRequestInput({})).toThrow(ApiError);
  });
});

describe("parsePurchaseRequestAction", () => {
  it("parses approve", () => {
    expect(parsePurchaseRequestAction({ action: "approve" })).toEqual({ action: "approve" });
  });

  it("parses cancel", () => {
    expect(parsePurchaseRequestAction({ action: "cancel" })).toEqual({ action: "cancel" });
  });

  it("parses reject with a reason", () => {
    expect(parsePurchaseRequestAction({ action: "reject", reason: "no stock" })).toEqual({
      action: "reject",
      reason: "no stock",
    });
  });

  it("rejects reject with no reason", () => {
    expect(() => parsePurchaseRequestAction({ action: "reject" })).toThrow(ApiError);
  });

  it("rejects an unknown action", () => {
    expect(() => parsePurchaseRequestAction({ action: "delete" })).toThrow(/action/i);
  });
});
