import { NextResponse } from "next/server";

import { ApiError, requireUser, toErrorResponse } from "@/lib/apiAuth";
import { getShop } from "@/lib/shopRepo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    if (!user.shopId) {
      throw new ApiError(403, "User is not associated with a shop");
    }

    // shopId comes from the session only — never from the query string.
    const shop = await getShop(user.shopId);
    if (!shop) {
      throw new ApiError(404, "Shop not found");
    }

    return NextResponse.json({ shop });
  } catch (error) {
    return toErrorResponse(error);
  }
}
