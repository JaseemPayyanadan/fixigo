import { NextRequest, NextResponse } from "next/server";

import {
  assertCanWriteSupplier,
  readJsonBody,
  requireUser,
  toErrorResponse,
} from "@/lib/apiAuth";
import { parseRecordPaymentInput } from "@/lib/purchaseValidation";
import { getSupplier, recordSupplierPayment } from "@/lib/supplierRepo";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const existing = await getSupplier(user.shopId ?? "", id);
    assertCanWriteSupplier(user, { shopId: existing.shopId, branchId: existing.branchId });

    const input = parseRecordPaymentInput(await readJsonBody(request));
    // The overdraw guard lives in the transaction, not here — this figure may
    // be stale by the time it commits.
    const { supplier, payment } = await recordSupplierPayment(
      existing.shopId,
      id,
      input,
      user.id
    );

    return NextResponse.json({ supplier, payment });
  } catch (error) {
    return toErrorResponse(error);
  }
}
