// src/app/api/purchases/item-suggestions/route.ts
import { NextResponse } from "next/server";

import { ApiError, requireUser, toErrorResponse } from "@/lib/apiAuth";
import { listItemSuggestions } from "@/lib/purchaseRepo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    if (user.role === "technician" || !user.shopId) {
      throw new ApiError(403, "Not permitted to view purchases");
    }
    return NextResponse.json(await listItemSuggestions(user.shopId));
  } catch (error) {
    return toErrorResponse(error);
  }
}
