export interface TotalsLine {
  quantity: number;
  purchasePrice: number;
}

export interface TotalsDiscount {
  mode: "amount" | "percent";
  value: number;
}

export interface TotalsInput {
  items: TotalsLine[];
  discount: TotalsDiscount;
  gstRate: number;
  transportCharge: number;
}

export interface PurchaseTotals {
  subtotal: number;
  discountAmount: number;
  gstAmount: number;
  transportCharge: number;
  grandTotal: number;
}

/**
 * Two-decimal rupees, rounded half away from zero. `Math.round` alone rounds
 * 2.675 down because the float is really 2.67499…, so nudge by an epsilon
 * proportional to the value before rounding. Non-finite input collapses to 0
 * rather than poisoning every downstream total with NaN.
 */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const scaled = value * 100;
  const nudged = scaled + (scaled >= 0 ? Number.EPSILON : -Number.EPSILON) * Math.abs(scaled);
  return Math.sign(nudged) * Math.round(Math.abs(nudged)) / 100;
}

export function lineTotalOf(quantity: number, purchasePrice: number): number {
  return roundMoney(quantity * purchasePrice);
}

/**
 * The single source of truth for purchase arithmetic, used by both the form
 * and the repo so the number on screen and the number persisted cannot differ.
 *
 * Order matters: discount applies to the subtotal, GST applies to the
 * DISCOUNTED subtotal, and transport is added afterwards untaxed.
 */
export function computeTotals(input: TotalsInput): PurchaseTotals {
  const subtotal = roundMoney(
    input.items.reduce((sum, item) => sum + lineTotalOf(item.quantity, item.purchasePrice), 0)
  );

  const rawDiscount =
    input.discount.mode === "percent"
      ? (subtotal * input.discount.value) / 100
      : input.discount.value;

  // Clamped so an over-large discount can never produce a negative bill.
  const discountAmount = roundMoney(Math.min(Math.max(rawDiscount, 0), subtotal));

  const taxable = roundMoney(subtotal - discountAmount);
  const gstAmount = roundMoney((taxable * input.gstRate) / 100);
  const transportCharge = roundMoney(Math.max(input.transportCharge, 0));
  const grandTotal = roundMoney(taxable + gstAmount + transportCharge);

  return { subtotal, discountAmount, gstAmount, transportCharge, grandTotal };
}
