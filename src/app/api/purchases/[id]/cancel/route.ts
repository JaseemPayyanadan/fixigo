// src/app/api/purchases/[id]/cancel/route.ts
import { NextRequest, NextResponse } from "next/server";

import {
  assertCanWritePurchase,
  readJsonBody,
  requireUser,
  toErrorResponse,
} from "@/lib/apiAuth";
import { cancelPurchase, getPurchase } from "@/lib/purchaseRepo";
import { parseCancelPurchaseInput } from "@/lib/purchaseValidation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const existing = await getPurchase(user.shopId ?? "", id);
    assertCanWritePurchase(user, { shopId: existing.shopId, branchId: existing.branchId });

    const { reason } = parseCancelPurchaseInput(await readJsonBody(request));
    // Soft cancel — the document is never removed.
    const purchase = await cancelPurchase(existing.shopId, id, reason);

    return NextResponse.json({ purchase });
  } catch (error) {
    return toErrorResponse(error);
  }
}
