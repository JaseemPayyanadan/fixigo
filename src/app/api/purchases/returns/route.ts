// src/app/api/purchases/returns/route.ts
import { NextRequest, NextResponse } from "next/server";

import { ApiError, listScopeFor, requireUser, toErrorResponse } from "@/lib/apiAuth";
import { listPurchaseReturns } from "@/lib/purchaseRepo";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role === "technician") {
      throw new ApiError(403, "Not permitted to view purchases");
    }

    const scope = listScopeFor(user, request.nextUrl.searchParams.get("branchId") ?? undefined);
    const returns = await listPurchaseReturns(scope.shopId, scope.branchId);

    return NextResponse.json({ returns });
  } catch (error) {
    return toErrorResponse(error);
  }
}
