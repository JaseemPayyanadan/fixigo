import { NextRequest, NextResponse } from "next/server";

import {
  assertCanWriteSupplier,
  readJsonBody,
  requireUser,
  toErrorResponse,
} from "@/lib/apiAuth";
import { parseRecordPaymentInput } from "@/lib/purchaseValidation";
import { deleteSupplierPayment, getSupplier, updateSupplierPayment } from "@/lib/supplierRepo";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; paymentId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id, paymentId } = await params;

    const existing = await getSupplier(user.shopId ?? "", id);
    assertCanWriteSupplier(user, { shopId: existing.shopId, branchId: existing.branchId });

    const input = parseRecordPaymentInput(await readJsonBody(request));
    const { supplier, payment } = await updateSupplierPayment(
      existing.shopId,
      id,
      paymentId,
      input
    );

    return NextResponse.json({ supplier, payment });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id, paymentId } = await params;

    const existing = await getSupplier(user.shopId ?? "", id);
    assertCanWriteSupplier(user, { shopId: existing.shopId, branchId: existing.branchId });

    const supplier = await deleteSupplierPayment(existing.shopId, id, paymentId);

    return NextResponse.json({ supplier });
  } catch (error) {
    return toErrorResponse(error);
  }
}
