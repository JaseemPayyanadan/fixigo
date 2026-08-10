import { NextRequest, NextResponse } from "next/server";

import {
  assertCanWritePurchase,
  readJsonBody,
  requireUser,
  toErrorResponse,
} from "@/lib/apiAuth";
import { deletePurchaseReturn, getPurchase, updatePurchaseReturn } from "@/lib/purchaseRepo";
import { parseRecordReturnInput } from "@/lib/purchaseValidation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; returnId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id, returnId } = await params;

    const existing = await getPurchase(user.shopId ?? "", id);
    assertCanWritePurchase(user, { shopId: existing.shopId, branchId: existing.branchId });

    const input = parseRecordReturnInput(await readJsonBody(request));
    const purchase = await updatePurchaseReturn(existing.shopId, id, returnId, input);

    return NextResponse.json({ purchase });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id, returnId } = await params;

    const existing = await getPurchase(user.shopId ?? "", id);
    assertCanWritePurchase(user, { shopId: existing.shopId, branchId: existing.branchId });

    const purchase = await deletePurchaseReturn(existing.shopId, id, returnId);

    return NextResponse.json({ purchase });
  } catch (error) {
    return toErrorResponse(error);
  }
}
