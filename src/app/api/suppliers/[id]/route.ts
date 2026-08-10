import { NextRequest, NextResponse } from "next/server";

import {
  ApiError,
  assertCanReadSupplier,
  assertCanWritePurchase,
  assertCanWriteSupplier,
  readJsonBody,
  requireUser,
  toErrorResponse,
} from "@/lib/apiAuth";
import { cancelPurchase, listPurchases } from "@/lib/purchaseRepo";
import { parseUpdateSupplierInput } from "@/lib/purchaseValidation";
import { deleteSupplier, getSupplier, updateSupplier } from "@/lib/supplierRepo";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function requireShopId(user: { shopId?: string }): string {
  if (!user.shopId) {
    throw new ApiError(403, "User is not associated with a shop");
  }
  return user.shopId;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const shopId = requireShopId(user);
    const { id } = await params;

    // The profile screen needs both halves, so serve them in one round trip.
    const supplier = await getSupplier(shopId, id);
    assertCanReadSupplier(user, { shopId: supplier.shopId, branchId: supplier.branchId });
    const purchases = await listPurchases({ shopId, supplierId: id });

    return NextResponse.json({ supplier, purchases });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const shopId = requireShopId(user);
    const { id } = await params;

    const existing = await getSupplier(shopId, id);
    assertCanWriteSupplier(user, { shopId: existing.shopId, branchId: existing.branchId });

    const input = parseUpdateSupplierInput(await readJsonBody(request));
    return NextResponse.json({ supplier: await updateSupplier(shopId, id, input) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const shopId = requireShopId(user);
    const { id } = await params;

    const supplier = await getSupplier(shopId, id);
    assertCanWriteSupplier(user, { shopId: supplier.shopId, branchId: supplier.branchId });

    const purchases = await listPurchases({ shopId, supplierId: id });

    // Fail closed before mutating anything: defense in depth in case a
    // purchase's branch ever diverges from its supplier's branch.
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
