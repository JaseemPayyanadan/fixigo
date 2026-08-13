// src/app/api/purchase-requests/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

import {
  ApiError,
  assertCanReadPurchaseRequest,
  assertCanWritePurchaseRequest,
  readJsonBody,
  requireUser,
  toErrorResponse,
} from "@/lib/apiAuth";
import {
  approvePurchaseRequest,
  cancelPurchaseRequest,
  getPurchaseRequest,
  rejectPurchaseRequest,
} from "@/lib/purchaseRequestRepo";
import { parsePurchaseRequestAction } from "@/lib/purchaseRequestValidation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const purchaseRequest = await getPurchaseRequest(user.shopId ?? "", id);
    assertCanReadPurchaseRequest(user, {
      shopId: purchaseRequest.shopId,
      branchId: purchaseRequest.branchId,
    });

    return NextResponse.json({ purchaseRequest });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const existing = await getPurchaseRequest(user.shopId ?? "", id);
    assertCanWritePurchaseRequest(user, {
      shopId: existing.shopId,
      branchId: existing.branchId,
    });

    const parsed = parsePurchaseRequestAction(await readJsonBody(request));
    const decidedBy = { userId: user.id, name: user.name || "" };

    if (parsed.action === "approve" || parsed.action === "reject") {
      // Tenancy is checked above; only branch_admin/shop_admin may decide.
      if (user.role === "technician") {
        throw new ApiError(403, "Not permitted to decide purchase requests");
      }
    }

    let purchaseRequest;
    if (parsed.action === "approve") {
      purchaseRequest = await approvePurchaseRequest(existing.shopId, id, decidedBy);
    } else if (parsed.action === "reject") {
      purchaseRequest = await rejectPurchaseRequest(existing.shopId, id, parsed.reason, decidedBy);
    } else {
      purchaseRequest = await cancelPurchaseRequest(existing.shopId, id, user.id);
    }

    return NextResponse.json({ purchaseRequest });
  } catch (error) {
    return toErrorResponse(error);
  }
}
