// src/app/api/purchases/[id]/payments/route.ts
import { NextRequest, NextResponse } from "next/server";

import {
  assertCanWritePurchase,
  readJsonBody,
  requireUser,
  toErrorResponse,
} from "@/lib/apiAuth";
import { getPurchase, recordPurchasePayment } from "@/lib/purchaseRepo";
import { parseRecordPaymentInput } from "@/lib/purchaseValidation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const existing = await getPurchase(user.shopId ?? "", id);
    assertCanWritePurchase(user, { shopId: existing.shopId, branchId: existing.branchId });

    const input = parseRecordPaymentInput(await readJsonBody(request));
    // The overdraw guard lives in the transaction, not here — this figure may
    // be stale by the time it commits.
    const purchase = await recordPurchasePayment(existing.shopId, id, input, user.id);

    return NextResponse.json({ purchase });
  } catch (error) {
    return toErrorResponse(error);
  }
}
