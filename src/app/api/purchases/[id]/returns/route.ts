// src/app/api/purchases/[id]/returns/route.ts
import { NextRequest, NextResponse } from "next/server";

import {
  assertCanWritePurchase,
  readJsonBody,
  requireUser,
  toErrorResponse,
} from "@/lib/apiAuth";
import { getPurchase, recordPurchaseReturn } from "@/lib/purchaseRepo";
import { parseRecordReturnInput } from "@/lib/purchaseValidation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const existing = await getPurchase(user.shopId ?? "", id);
    assertCanWritePurchase(user, { shopId: existing.shopId, branchId: existing.branchId });

    const input = parseRecordReturnInput(await readJsonBody(request));
    // The overdraw guard lives in the transaction, not here — this figure may
    // be stale by the time it commits.
    const purchase = await recordPurchaseReturn(existing.shopId, id, input, {
      userId: user.id,
      name: user.name || "",
    });

    return NextResponse.json({ purchase });
  } catch (error) {
    return toErrorResponse(error);
  }
}
