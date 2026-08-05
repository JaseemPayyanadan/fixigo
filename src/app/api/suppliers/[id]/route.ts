import { NextRequest, NextResponse } from "next/server";

import {
  assertCanManageSuppliers,
  readJsonBody,
  requireUser,
  toErrorResponse,
} from "@/lib/apiAuth";
import { listPurchases } from "@/lib/purchaseRepo";
import { parseUpdateSupplierInput } from "@/lib/purchaseValidation";
import { getSupplier, updateSupplier } from "@/lib/supplierRepo";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const shopId = assertCanManageSuppliers(user);
    const { id } = await params;

    // The profile screen needs both halves, so serve them in one round trip.
    const [supplier, purchases] = await Promise.all([
      getSupplier(shopId, id),
      listPurchases({ shopId, supplierId: id }),
    ]);

    return NextResponse.json({ supplier, purchases });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const shopId = assertCanManageSuppliers(user);
    const { id } = await params;
    const input = parseUpdateSupplierInput(await readJsonBody(request));

    return NextResponse.json({ supplier: await updateSupplier(shopId, id, input) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
