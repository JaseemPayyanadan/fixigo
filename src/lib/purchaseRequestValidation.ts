import { ApiError } from "@/lib/apiAuth";

export interface PurchaseRequestItemInput {
  name: string;
  brand?: string;
  model?: string;
  quantity: number;
  remarks?: string;
}

export interface CreatePurchaseRequestInput {
  serviceId: string;
  items: PurchaseRequestItemInput[];
}

export type PurchaseRequestAction =
  | { action: "approve" }
  | { action: "reject"; reason: string }
  | { action: "cancel" };

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

function parseItem(value: unknown, index: number): PurchaseRequestItemInput {
  const raw = asObject(value, `Item ${index + 1}`);

  const name = raw.name;
  if (typeof name !== "string" || name.trim() === "") {
    throw new ApiError(400, `Item ${index + 1}: item name is required`);
  }

  const quantityRaw = raw.quantity;
  const quantity = typeof quantityRaw === "string" ? Number(quantityRaw) : quantityRaw;
  if (typeof quantity !== "number" || !Number.isFinite(quantity)) {
    throw new ApiError(400, `Item ${index + 1}: quantity must be a number`);
  }
  if (!Number.isInteger(quantity)) {
    throw new ApiError(400, `Item ${index + 1}: quantity must be a whole number`);
  }
  if (quantity < 1) {
    throw new ApiError(400, `Item ${index + 1}: quantity must be at least 1`);
  }

  return {
    name: name.trim(),
    brand: optionalString(raw, "brand"),
    model: optionalString(raw, "model"),
    quantity,
    remarks: optionalString(raw, "remarks"),
  };
}

export function parseCreatePurchaseRequestInput(body: unknown): CreatePurchaseRequestInput {
  const raw = asObject(body);

  const serviceId = requireString(raw, "serviceId");

  if (!Array.isArray(raw.items) || raw.items.length === 0) {
    throw new ApiError(400, "A purchase request needs at least one item");
  }
  const items = raw.items.map(parseItem);

  return { serviceId, items };
}

export function parseRejectPurchaseRequestInput(body: unknown): { reason: string } {
  const raw = asObject(body);
  return { reason: requireString(raw, "reason") };
}

export function parsePurchaseRequestAction(body: unknown): PurchaseRequestAction {
  const raw = asObject(body);
  const action = raw.action;

  if (action === "approve") return { action: "approve" };
  if (action === "cancel") return { action: "cancel" };
  if (action === "reject") return { action: "reject", reason: requireString(raw, "reason") };

  throw new ApiError(400, "action must be approve, reject or cancel");
}
