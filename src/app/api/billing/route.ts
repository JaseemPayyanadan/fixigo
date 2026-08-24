import { NextResponse } from "next/server";

import { ApiError, requireUser, toErrorResponse } from "@/lib/apiAuth";
import { listInvoicesForShop, nextBillingDate } from "@/lib/billingRepo";
import { getShop } from "@/lib/shopRepo";

export const dynamic = "force-dynamic";

/** Billing history for the signed-in user's shop, most recent first. */
export async function GET() {
  try {
    const user = await requireUser();
    if (!user.shopId) {
      throw new ApiError(403, "User is not associated with a shop");
    }

    const [invoices, shop] = await Promise.all([listInvoicesForShop(user.shopId), getShop(user.shopId)]);

    const upcomingBillingDate = shop && shop.activePlanId ? nextBillingDate(shop.createdAt) : null;

    return NextResponse.json({ invoices, upcomingBillingDate });
  } catch (error) {
    return toErrorResponse(error);
  }
}
