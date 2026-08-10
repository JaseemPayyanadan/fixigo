// src/lib/purchaseValidation.ts
import { ApiError } from "@/lib/apiAuth";
import { computeTotals } from "@/lib/purchaseTotals";
import { validateGstNumber, validatePhone } from "@/lib/validation";
import type { PurchasePaymentMethod, SupplierStatus } from "@/types/purchase";

export interface CreateSupplierInput {
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  gstNumber?: string;
  address?: string;
  status: SupplierStatus;
  /** What's already owed to this supplier from before they were added here. */
  openingBalance?: number;
}

export type UpdateSupplierInput = Partial<CreateSupplierInput>;

export interface PurchaseItemInput {
  name: string;
  brand?: string;
  model?: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice?: number;
  warrantyMonths?: number;
  remarks?: string;
  serviceId?: string;
  serviceRef?: string;
}

export interface RecordPaymentInput {
  amount: number;
  method: PurchasePaymentMethod;
  paidAt: Date;
  reference?: string;
  notes?: string;
}

export interface CreatePurchaseInput {
  supplierId: string;
  supplierInvoiceNo?: string;
  purchaseDate: Date;
  items: PurchaseItemInput[];
  discount: { mode: "amount" | "percent"; value: number };
  gstRate: number;
  transportCharge: number;
  dueDate?: Date;
  /** Absent means the bill was raised on credit. */
  initialPayment?: RecordPaymentInput;
}

const PAYMENT_METHODS: readonly PurchasePaymentMethod[] = ["cash", "upi", "bank"];
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

function asObject(body: unknown, label = "Request body"): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new ApiError(400, `${label} must be an object`);
  }
  return body as Record<string, unknown>;
}

function requireString(raw: Record<string, unknown>, field: string): string {
  const value = raw[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new ApiError(400, `${field} is required`);
  }
  return value.trim();
}

function optionalString(raw: Record<string, unknown>, field: string): string | undefined {
  const value = raw[field];
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new ApiError(400, `${field} must be text`);
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function requireNumber(raw: Record<string, unknown>, field: string, label: string): number {
  const value = raw[field];
  const parsed = typeof value === "string" ? Number(value) : value;
  if (typeof parsed !== "number" || !Number.isFinite(parsed)) {
    throw new ApiError(400, `${label} must be a number`);
  }
  return parsed;
}

function optionalNumber(raw: Record<string, unknown>, field: string, label: string): number | undefined {
  if (raw[field] === undefined || raw[field] === null || raw[field] === "") return undefined;
  return requireNumber(raw, field, label);
}

function requireDate(raw: Record<string, unknown>, field: string, label: string): Date {
  const value = raw[field];
  if (typeof value !== "string" && !(value instanceof Date)) {
    throw new ApiError(400, `A valid ${label} is required`);
  }
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, `A valid ${label} is required`);
  }
  return parsed;
}

function optionalDate(raw: Record<string, unknown>, field: string, label: string): Date | undefined {
  if (raw[field] === undefined || raw[field] === null || raw[field] === "") return undefined;
  return requireDate(raw, field, label);
}

function parsePaymentMethod(value: unknown): PurchasePaymentMethod {
  if (typeof value !== "string" || !PAYMENT_METHODS.includes(value as PurchasePaymentMethod)) {
    throw new ApiError(400, "payment method must be cash, upi or bank");
  }
  return value as PurchasePaymentMethod;
}

function parseSupplierFields(raw: Record<string, unknown>): Omit<CreateSupplierInput, "status"> {
  const phone = requireString(raw, "phone");
  if (!validatePhone(phone)) {
    throw new ApiError(400, "A valid phone number is required");
  }
  // The shared validatePhone has no minimum length, and a supplier you cannot
  // dial is not a usable supplier. Enforced here rather than in the shared
  // validator so technician and registration flows keep their looser rule.
  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    throw new ApiError(400, "A valid phone number is required");
  }

  const email = optionalString(raw, "email");
  if (email && !EMAIL_PATTERN.test(email)) {
    throw new ApiError(400, "Enter a valid email address");
  }

  const gstNumber = optionalString(raw, "gstNumber");
  if (gstNumber && !validateGstNumber(gstNumber)) {
    throw new ApiError(400, "A valid GST number is required");
  }

  return {
    name: requireString(raw, "name"),
    contactPerson: requireString(raw, "contactPerson"),
    phone,
    email,
    gstNumber: gstNumber?.toUpperCase(),
    address: optionalString(raw, "address"),
  };
}

export function parseCreateSupplierInput(body: unknown): CreateSupplierInput {
  const raw = asObject(body);
  const openingBalance = optionalNumber(raw, "openingBalance", "Outstanding balance") ?? 0;
  if (openingBalance < 0) {
    throw new ApiError(400, "Outstanding balance cannot be negative");
  }
  return { ...parseSupplierFields(raw), status: "active", openingBalance };
}

export function parseUpdateSupplierInput(body: unknown): UpdateSupplierInput {
  const raw = asObject(body);
  const status = raw.status;
  if (status !== undefined && status !== "active" && status !== "inactive") {
    throw new ApiError(400, "status must be active or inactive");
  }

  // Reuses the same field rules so an update cannot bypass them.
  const fields = parseSupplierFields(raw);
  return status === undefined ? fields : { ...fields, status };
}

function parseItem(value: unknown, index: number): PurchaseItemInput {
  const raw = asObject(value, `Item ${index + 1}`);

  const name = raw.name;
  if (typeof name !== "string" || name.trim() === "") {
    throw new ApiError(400, `Item ${index + 1}: item name is required`);
  }

  const quantity = requireNumber(raw, "quantity", `Item ${index + 1} quantity`);
  if (!Number.isInteger(quantity)) {
    throw new ApiError(400, `Item ${index + 1}: quantity must be a whole number`);
  }
  if (quantity < 1) {
    throw new ApiError(400, `Item ${index + 1}: quantity must be at least 1`);
  }

  const purchasePrice = requireNumber(raw, "purchasePrice", `Item ${index + 1} purchase price`);
  if (purchasePrice < 0) {
    throw new ApiError(400, `Item ${index + 1}: purchase price cannot be negative`);
  }

  const sellingPrice = optionalNumber(raw, "sellingPrice", `Item ${index + 1} selling price`);
  if (sellingPrice !== undefined && sellingPrice < 0) {
    throw new ApiError(400, `Item ${index + 1}: selling price cannot be negative`);
  }

  const warrantyMonths = optionalNumber(raw, "warrantyMonths", `Item ${index + 1} warranty`);
  if (warrantyMonths !== undefined && (warrantyMonths < 0 || !Number.isInteger(warrantyMonths))) {
    throw new ApiError(400, `Item ${index + 1}: warranty must be a whole number of months`);
  }

  return {
    name: name.trim(),
    brand: optionalString(raw, "brand"),
    model: optionalString(raw, "model"),
    quantity,
    purchasePrice,
    sellingPrice,
    warrantyMonths,
    remarks: optionalString(raw, "remarks"),
    serviceId: optionalString(raw, "serviceId"),
    serviceRef: optionalString(raw, "serviceRef"),
  };
}

function parsePaymentFields(raw: Record<string, unknown>): RecordPaymentInput {
  const amount = requireNumber(raw, "amount", "Payment amount");
  if (amount <= 0) {
    throw new ApiError(400, "Payment amount must be greater than zero");
  }

  return {
    amount,
    method: parsePaymentMethod(raw.method),
    paidAt: requireDate(raw, "paidAt", "payment date"),
    reference: optionalString(raw, "reference"),
    notes: optionalString(raw, "notes"),
  };
}

export function parseRecordPaymentInput(body: unknown): RecordPaymentInput {
  return parsePaymentFields(asObject(body));
}

export function parseCreatePurchaseInput(body: unknown): CreatePurchaseInput {
  const raw = asObject(body);

  const supplierId = requireString(raw, "supplierId");
  const purchaseDate = requireDate(raw, "purchaseDate", "purchase date");

  if (!Array.isArray(raw.items) || raw.items.length === 0) {
    throw new ApiError(400, "A purchase needs at least one item");
  }
  const items = raw.items.map(parseItem);

  const discountRaw = asObject(raw.discount ?? { mode: "amount", value: 0 }, "discount");
  const discountMode = discountRaw.mode === "percent" ? "percent" : "amount";
  const discountValue = requireNumber(discountRaw, "value", "Discount");
  if (discountValue < 0) {
    throw new ApiError(400, "Discount cannot be negative");
  }
  if (discountMode === "percent" && discountValue > 100) {
    throw new ApiError(400, "Discount cannot exceed 100%");
  }

  const gstRate = raw.gstRate === undefined ? 0 : requireNumber(raw, "gstRate", "GST rate");
  if (gstRate < 0 || gstRate > 28) {
    throw new ApiError(400, "GST rate must be between 0 and 28");
  }

  const transportCharge =
    raw.transportCharge === undefined ? 0 : requireNumber(raw, "transportCharge", "Transport charge");
  if (transportCharge < 0) {
    throw new ApiError(400, "Transport charge cannot be negative");
  }

  const discount = { mode: discountMode as "amount" | "percent", value: discountValue };
  const totals = computeTotals({ items, discount, gstRate, transportCharge });

  // Checked against the raw figure, because computeTotals clamps the discount
  // to the subtotal and would otherwise silently swallow the mistake.
  const rawDiscountAmount =
    discountMode === "percent" ? (totals.subtotal * discountValue) / 100 : discountValue;
  if (rawDiscountAmount > totals.subtotal) {
    throw new ApiError(400, "Discount cannot exceed the subtotal");
  }

  const initialPayment =
    raw.initialPayment === undefined || raw.initialPayment === null
      ? undefined
      : parsePaymentFields(asObject(raw.initialPayment, "initialPayment"));

  if (initialPayment && initialPayment.amount > totals.grandTotal) {
    throw new ApiError(400, "Payment cannot exceed the grand total");
  }

  const dueDate = optionalDate(raw, "dueDate", "due date");
  if (dueDate && dueDate.getTime() < purchaseDate.getTime()) {
    throw new ApiError(400, "Due date cannot be before the purchase date");
  }

  return {
    supplierId,
    supplierInvoiceNo: optionalString(raw, "supplierInvoiceNo"),
    purchaseDate,
    items,
    discount,
    gstRate,
    transportCharge,
    dueDate,
    initialPayment,
  };
}

/** An edit carries the same shape; whether it is permitted is the repo's call. */
export function parseUpdatePurchaseInput(body: unknown): CreatePurchaseInput {
  return parseCreatePurchaseInput(body);
}

export function parseCancelPurchaseInput(body: unknown): { reason: string } {
  const raw = asObject(body);
  const reason = raw.reason;
  if (typeof reason !== "string" || reason.trim() === "") {
    throw new ApiError(400, "A cancellation reason is required");
  }
  return { reason: reason.trim() };
}

export interface ReturnPurchaseLineInput {
  itemId: string;
  quantity: number;
}

export interface ReturnPurchaseInput {
  items: ReturnPurchaseLineInput[];
  reason: string;
}

function parseReturnLine(value: unknown, index: number): ReturnPurchaseLineInput {
  const raw = asObject(value, `Return item ${index + 1}`);

  const quantity = requireNumber(raw, "quantity", `Return item ${index + 1} quantity`);
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new ApiError(
      400,
      `Return item ${index + 1}: quantity must be a whole number of at least 1`
    );
  }

  return { itemId: requireString(raw, "itemId"), quantity };
}

export function parseReturnPurchaseInput(body: unknown): ReturnPurchaseInput {
  const raw = asObject(body);

  if (!Array.isArray(raw.items) || raw.items.length === 0) {
    throw new ApiError(400, "A return needs at least one item");
  }
  const items = raw.items.map(parseReturnLine);
  const reason = requireString(raw, "reason");

  return { items, reason };
}

/** A flat return against a bill: one amount and an optional note, no line-item picking. */
export interface RecordReturnInput {
  amount: number;
  reason?: string;
}

export function parseRecordReturnInput(body: unknown): RecordReturnInput {
  const raw = asObject(body);

  const amount = requireNumber(raw, "amount", "Return amount");
  if (amount <= 0) {
    throw new ApiError(400, "Return amount must be greater than zero");
  }

  return { amount, reason: optionalString(raw, "reason") };
}

export interface RecordRefundInput {
  amount: number;
  method: PurchasePaymentMethod;
  receivedAt: Date;
  reference?: string;
  notes?: string;
}

export function parseRecordRefundInput(body: unknown): RecordRefundInput {
  const raw = asObject(body);

  const amount = requireNumber(raw, "amount", "Refund amount");
  if (amount <= 0) {
    throw new ApiError(400, "Refund amount must be greater than zero");
  }

  return {
    amount,
    method: parsePaymentMethod(raw.method),
    receivedAt: requireDate(raw, "receivedAt", "refund date"),
    reference: optionalString(raw, "reference"),
    notes: optionalString(raw, "notes"),
  };
}
