// src/app/api/purchases/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

import {
  assertCanReadPurchase,
  assertCanWritePurchase,
  readJsonBody,
  requireUser,
  toErrorResponse,
} from "@/lib/apiAuth";
import { getPurchase, updatePurchase } from "@/lib/purchaseRepo";
import { parseUpdatePurchaseInput } from "@/lib/purchaseValidation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const purchase = await getPurchase(user.shopId ?? "", id);
    // Checked after loading, because the branch to authorize against is the
    // purchase's own branch, not one the caller asserted.
    assertCanReadPurchase(user, { shopId: purchase.shopId, branchId: purchase.branchId });

    return NextResponse.json({ purchase });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const existing = await getPurchase(user.shopId ?? "", id);
    assertCanWritePurchase(user, { shopId: existing.shopId, branchId: existing.branchId });

    const input = parseUpdatePurchaseInput(await readJsonBody(request));
    // The repo enforces the payments-lock; the UI merely hides the button.
    const purchase = await updatePurchase(existing.shopId, id, input);

    return NextResponse.json({ purchase });
  } catch (error) {
    return toErrorResponse(error);
  }
}
