import { adminDb } from "@/lib/firebaseAdmin";

export const SHOPS = "shops";

export interface ShopSummary {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  gstNumber?: string;
}

/**
 * Onboarding (`/api/shop/onboarding`) stores address as separate
 * `address`/`city`/`pinCode` fields rather than the single `address` string
 * the `Shop` type exposes elsewhere, so join them here for display.
 */
export function mapShopSummary(id: string, data: Record<string, unknown>): ShopSummary {
  const addressParts = [data.address, data.city, data.pinCode]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0);

  return {
    id,
    name: (data.name as string) || "",
    address: addressParts.join(", "),
    phone: (data.phone as string) || "",
    email: (data.email as string) || "",
    gstNumber: (data.gstNumber as string) || undefined,
  };
}

export async function getShop(shopId: string): Promise<ShopSummary | null> {
  const snapshot = await adminDb.collection(SHOPS).doc(shopId).get();
  if (!snapshot.exists) return null;
  return mapShopSummary(snapshot.id, snapshot.data() as Record<string, unknown>);
}
