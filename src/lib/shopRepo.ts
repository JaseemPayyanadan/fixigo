import { adminDb } from "@/lib/firebaseAdmin";
import { ApiError } from "@/lib/apiAuth";

export const SHOPS = "shops";

/** Firestore Timestamp, JS Date, or ISO string. */
function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date(0);
}

export interface ShopBusinessDay {
  open: string;
  close: string;
  closed: boolean;
}

export type ShopBusinessHours = Partial<Record<"monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday", ShopBusinessDay>>;

export interface ShopSummary {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  gstNumber?: string;
  businessType?: string;
  description?: string;
  notificationsEnabled: boolean;
  businessHours: ShopBusinessHours;
  /** Doc id in the `plans` collection, or undefined when never assigned. */
  activePlanId?: string;
  /** Anchors the shop's monthly billing cycle (bills on this day-of-month). */
  createdAt: Date;
}

/**
 * Onboarding (`/api/shop/onboarding`) stores address as separate
 * `address`/`city`/`pinCode` fields rather than the single `address` string
 * the `Shop` type exposes elsewhere, so join them here for display.
 */
export function mapShopSummary(id: string, data: Record<string, unknown>): ShopSummary {
  const addressParts = [data.address, data.city, data.pinCode]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0);

  const settings = (data.settings as Record<string, unknown> | undefined) ?? {};

  return {
    id,
    name: (data.name as string) || "",
    address: addressParts.join(", "),
    phone: (data.phone as string) || "",
    email: (data.email as string) || "",
    gstNumber: (data.gstNumber as string) || undefined,
    businessType: (data.businessType as string) || undefined,
    description: (data.description as string) || undefined,
    // Absent means never configured — default to on, the same as a shop would expect out of the box.
    notificationsEnabled: settings.notifications !== false,
    businessHours: (data.businessHours as ShopBusinessHours) ?? {},
    activePlanId: (data.activePlanId as string) || undefined,
    createdAt: toDate(data.createdAt),
  };
}

export async function getShop(shopId: string): Promise<ShopSummary | null> {
  const snapshot = await adminDb.collection(SHOPS).doc(shopId).get();
  if (!snapshot.exists) return null;
  return mapShopSummary(snapshot.id, snapshot.data() as Record<string, unknown>);
}

export interface UpdateShopInput {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  gstNumber?: string;
  businessType?: string;
  description?: string;
  notificationsEnabled?: boolean;
  businessHours?: ShopBusinessHours;
}

/**
 * Writes the editable fields from the Settings page. `address` here replaces
 * the whole address going forward — the onboarding-era `city`/`pinCode` split
 * is cleared alongside it so `mapShopSummary`'s join never doubles the city
 * onto an address that already includes it.
 */
export async function updateShop(shopId: string, updates: UpdateShopInput): Promise<ShopSummary> {
  const ref = adminDb.collection(SHOPS).doc(shopId);
  const existing = await ref.get();
  if (!existing.exists) {
    throw new ApiError(404, "Shop not found");
  }

  const cleanUpdates: Record<string, unknown> = { updatedAt: new Date() };

  if (updates.name !== undefined) cleanUpdates.name = updates.name;
  if (updates.phone !== undefined) cleanUpdates.phone = updates.phone;
  if (updates.email !== undefined) cleanUpdates.email = updates.email;
  if (updates.gstNumber !== undefined) cleanUpdates.gstNumber = updates.gstNumber;
  if (updates.businessType !== undefined) cleanUpdates.businessType = updates.businessType;
  if (updates.description !== undefined) cleanUpdates.description = updates.description;
  if (updates.businessHours !== undefined) cleanUpdates.businessHours = updates.businessHours;
  if (updates.notificationsEnabled !== undefined) {
    const existingSettings = (existing.data()?.settings as Record<string, unknown> | undefined) ?? {};
    cleanUpdates.settings = { ...existingSettings, notifications: updates.notificationsEnabled };
  }
  if (updates.address !== undefined) {
    cleanUpdates.address = updates.address;
    cleanUpdates.city = "";
    cleanUpdates.pinCode = "";
  }

  await ref.update(cleanUpdates);
  const updated = await ref.get();
  return mapShopSummary(updated.id, updated.data() as Record<string, unknown>);
}
