import { NextRequest, NextResponse } from "next/server";

import { ApiError, requireUser, toErrorResponse } from "@/lib/apiAuth";
import { getInvoiceForShop } from "@/lib/billingRepo";
import { getShop } from "@/lib/shopRepo";

export const dynamic = "force-dynamic";

/** A single billing invoice for the signed-in user's shop — used by the receipt view. */
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user.shopId) {
      throw new ApiError(403, "User is not associated with a shop");
    }

    const { id } = await context.params;
    const invoice = await getInvoiceForShop(user.shopId, id);
    if (!invoice) {
      throw new ApiError(404, "Invoice not found");
    }

    const shop = await getShop(user.shopId);

    return NextResponse.json({ invoice, shop });
  } catch (error) {
    return toErrorResponse(error);
  }
}
