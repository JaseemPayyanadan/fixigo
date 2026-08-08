import { NextRequest, NextResponse } from "next/server";

import {
  assertCanManageSuppliers,
  assertCanWritePurchase,
  readJsonBody,
  requireUser,
  toErrorResponse,
} from "@/lib/apiAuth";
import { cancelPurchase, listPurchases } from "@/lib/purchaseRepo";
import { parseUpdateSupplierInput } from "@/lib/purchaseValidation";
import { deleteSupplier, getSupplier, updateSupplier } from "@/lib/supplierRepo";

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

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const shopId = assertCanManageSuppliers(user);
    const { id } = await params;

    const supplier = await getSupplier(shopId, id);
    const purchases = await listPurchases({ shopId, supplierId: id });

    // Fail closed before mutating anything: a branch_admin can manage a
    // shop-wide supplier but may not have write access to every branch that
    // bought from them.
    for (const purchase of purchases) {
      assertCanWritePurchase(user, { shopId: purchase.shopId, branchId: purchase.branchId });
    }

    for (const purchase of purchases) {
      await cancelPurchase(shopId, purchase.id, `Supplier "${supplier.name}" was deleted`);
    }

    return NextResponse.json({ supplier: await deleteSupplier(shopId, id) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

