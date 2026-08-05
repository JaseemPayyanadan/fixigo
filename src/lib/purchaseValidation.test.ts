// src/lib/purchaseValidation.test.ts
import { describe, expect, it } from "vitest";

import {
  parseCancelPurchaseInput,
  parseCreatePurchaseInput,
  parseCreateSupplierInput,
  parseRecordPaymentInput,
} from "@/lib/purchaseValidation";

function validPurchaseBody(overrides: Record<string, unknown> = {}) {
  return {
    supplierId: "sup-1",
    purchaseDate: "2026-08-05T00:00:00.000Z",
    items: [{ name: "Display", quantity: 3, purchasePrice: 1800 }],
    discount: { mode: "amount", value: 0 },
    gstRate: 18,
    transportCharge: 0,
    initialPayment: { amount: 1000, method: "upi", paidAt: "2026-08-05T00:00:00.000Z" },
    ...overrides,
  };
}

describe("parseCreateSupplierInput", () => {
  it("accepts a minimal supplier", () => {
    const input = parseCreateSupplierInput({
      name: "  ABC Mobiles  ",
      contactPerson: "Rahul",
      phone: "9876543210",
    });
    expect(input.name).toBe("ABC Mobiles");
    expect(input.status).toBe("active");
  });

  it("rejects a missing name", () => {
    expect(() => parseCreateSupplierInput({ contactPerson: "R", phone: "9876543210" })).toThrow(
      /name is required/i
    );
  });

  it("rejects an invalid phone", () => {
    expect(() =>
      parseCreateSupplierInput({ name: "ABC", contactPerson: "R", phone: "123" })
    ).toThrow(/valid phone/i);
  });

  it("rejects a malformed GST number when one is supplied", () => {
    expect(() =>
      parseCreateSupplierInput({
        name: "ABC",
        contactPerson: "R",
        phone: "9876543210",
        gstNumber: "NOTAGST",
      })
    ).toThrow(/valid GST/i);
  });

  it("accepts an omitted GST number", () => {
    const input = parseCreateSupplierInput({
      name: "ABC",
      contactPerson: "R",
      phone: "9876543210",
    });
    expect(input.gstNumber).toBeUndefined();
  });

  it("accepts a phone with country code and spacing", () => {
    const input = parseCreateSupplierInput({
      name: "ABC",
      contactPerson: "R",
      phone: "+91 98765 43210",
    });
    expect(input.phone).toBe("+91 98765 43210");
  });

  it("rejects a phone with more than 15 digits", () => {
    expect(() =>
      parseCreateSupplierInput({
        name: "ABC",
        contactPerson: "R",
        phone: "98765432109876543",
      })
    ).toThrow(/valid phone/i);
  });
});

describe("parseCreatePurchaseInput", () => {
  it("accepts a valid purchase", () => {
    const input = parseCreatePurchaseInput(validPurchaseBody());
    expect(input.supplierId).toBe("sup-1");
    expect(input.items).toHaveLength(1);
    expect(input.items[0].quantity).toBe(3);
  });

  it("rejects a missing supplier", () => {
    expect(() => parseCreatePurchaseInput(validPurchaseBody({ supplierId: "" }))).toThrow(
      /supplierId is required/i
    );
  });

  it("rejects an empty item list", () => {
    expect(() => parseCreatePurchaseInput(validPurchaseBody({ items: [] }))).toThrow(
      /at least one item/i
    );
  });

  it("rejects an item with a blank name", () => {
    expect(() =>
      parseCreatePurchaseInput(
        validPurchaseBody({ items: [{ name: "  ", quantity: 1, purchasePrice: 10 }] })
      )
    ).toThrow(/item name is required/i);
  });

  it("rejects a quantity below 1", () => {
    expect(() =>
      parseCreatePurchaseInput(
        validPurchaseBody({ items: [{ name: "Display", quantity: 0, purchasePrice: 10 }] })
      )
    ).toThrow(/quantity must be at least 1/i);
  });

  it("rejects a fractional quantity", () => {
    expect(() =>
      parseCreatePurchaseInput(
        validPurchaseBody({ items: [{ name: "Display", quantity: 1.5, purchasePrice: 10 }] })
      )
    ).toThrow(/whole number/i);
  });

  it("rejects a negative purchase price", () => {
    expect(() =>
      parseCreatePurchaseInput(
        validPurchaseBody({ items: [{ name: "Display", quantity: 1, purchasePrice: -5 }] })
      )
    ).toThrow(/purchase price cannot be negative/i);
  });

  it("rejects a discount larger than the subtotal", () => {
    expect(() =>
      parseCreatePurchaseInput(
        validPurchaseBody({ discount: { mode: "amount", value: 99999 } })
      )
    ).toThrow(/discount cannot exceed/i);
  });

  it("rejects a GST rate above 28", () => {
    expect(() => parseCreatePurchaseInput(validPurchaseBody({ gstRate: 30 }))).toThrow(
      /GST rate must be between 0 and 28/i
    );
  });

  it("rejects a negative transport charge", () => {
    expect(() => parseCreatePurchaseInput(validPurchaseBody({ transportCharge: -1 }))).toThrow(
      /transport charge cannot be negative/i
    );
  });

  it("rejects an initial payment larger than the grand total", () => {
    expect(() =>
      parseCreatePurchaseInput(
        validPurchaseBody({
          initialPayment: { amount: 999999, method: "cash", paidAt: "2026-08-05T00:00:00.000Z" },
        })
      )
    ).toThrow(/cannot exceed the grand total/i);
  });

  it("rejects an unknown payment method", () => {
    expect(() =>
      parseCreatePurchaseInput(
        validPurchaseBody({
          initialPayment: { amount: 10, method: "credit", paidAt: "2026-08-05T00:00:00.000Z" },
        })
      )
    ).toThrow(/payment method/i);
  });

  it("requires a due date when there is no initial payment", () => {
    expect(() =>
      parseCreatePurchaseInput(validPurchaseBody({ initialPayment: undefined }))
    ).toThrow(/due date is required/i);
  });

  it("accepts a credit purchase that supplies a due date", () => {
    const input = parseCreatePurchaseInput(
      validPurchaseBody({
        initialPayment: undefined,
        dueDate: "2026-09-05T00:00:00.000Z",
      })
    );
    expect(input.initialPayment).toBeUndefined();
    expect(input.dueDate).toBeInstanceOf(Date);
  });

  it("rejects a due date before the purchase date", () => {
    expect(() =>
      parseCreatePurchaseInput(
        validPurchaseBody({
          initialPayment: undefined,
          dueDate: "2026-08-01T00:00:00.000Z",
        })
      )
    ).toThrow(/due date cannot be before/i);
  });

  it("rejects an unparseable purchase date", () => {
    expect(() => parseCreatePurchaseInput(validPurchaseBody({ purchaseDate: "yesterday" }))).toThrow(
      /valid purchase date/i
    );
  });
});

describe("parseRecordPaymentInput", () => {
  it("accepts a valid payment", () => {
    const input = parseRecordPaymentInput({
      amount: 2500,
      method: "upi",
      paidAt: "2026-08-05T00:00:00.000Z",
      reference: "UPI-4587963210",
    });
    expect(input.amount).toBe(2500);
    expect(input.method).toBe("upi");
    expect(input.reference).toBe("UPI-4587963210");
  });

  it("rejects a zero amount", () => {
    expect(() =>
      parseRecordPaymentInput({ amount: 0, method: "cash", paidAt: "2026-08-05T00:00:00.000Z" })
    ).toThrow(/greater than zero/i);
  });

  it("rejects a negative amount", () => {
    expect(() =>
      parseRecordPaymentInput({ amount: -100, method: "cash", paidAt: "2026-08-05T00:00:00.000Z" })
    ).toThrow(/greater than zero/i);
  });
});

describe("parseCancelPurchaseInput", () => {
  it("requires a reason", () => {
    expect(() => parseCancelPurchaseInput({ reason: "   " })).toThrow(/reason is required/i);
  });

  it("trims an accepted reason", () => {
    expect(parseCancelPurchaseInput({ reason: "  wrong supplier  " }).reason).toBe(
      "wrong supplier"
    );
  });
});
