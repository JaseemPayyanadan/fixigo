// src/app/api/purchase-requests/route.ts
import { NextRequest, NextResponse } from "next/server";

import {
  ApiError,
  assertCanWritePurchaseRequest,
  listScopeFor,
  readJsonBody,
  requireUser,
  toErrorResponse,
} from "@/lib/apiAuth";
import { createPurchaseRequest, listPurchaseRequests } from "@/lib/purchaseRequestRepo";
import { parseCreatePurchaseRequestInput } from "@/lib/purchaseRequestValidation";
import { shortServiceRef } from "@/lib/repairLabel";
import { getService } from "@/lib/serviceRepo";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const scope = listScopeFor(user, request.nextUrl.searchParams.get("branchId") ?? undefined);

    const purchaseRequests = await listPurchaseRequests(scope);

    return NextResponse.json({ purchaseRequests });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJsonBody(request);
    const input = parseCreatePurchaseRequestInput(body);

    const service = await getService(input.serviceId);
    if (!service) {
      throw new ApiError(404, "Service not found");
    }
    if (!user.shopId || service.shopId !== user.shopId) {
      throw new ApiError(403, "Service does not belong to this shop");
    }

    assertCanWritePurchaseRequest(user, { shopId: service.shopId, branchId: service.branchId });

    const purchaseRequest = await createPurchaseRequest({
      ...input,
      shopId: service.shopId,
      branchId: service.branchId,
      serviceRef: shortServiceRef(service.id),
      customerName: service.customer?.name || "",
      requestedBy: { userId: user.id, name: user.name || "" },
    });

    return NextResponse.json({ purchaseRequest }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
