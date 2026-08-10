import { NextRequest, NextResponse } from "next/server";

import {
  ApiError,
  assertCanWriteSupplier,
  listScopeFor,
  readJsonBody,
  requireUser,
  toErrorResponse,
} from "@/lib/apiAuth";
import { parseCreateSupplierInput } from "@/lib/purchaseValidation";
import { createSupplier, listSuppliers } from "@/lib/supplierRepo";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role === "technician") {
      throw new ApiError(403, "Not permitted to view suppliers");
    }

    // listScopeFor already pins a non-shop-admin to their own branch; a
    // shop_admin with no branchId in the query sees every branch's suppliers.
    const scope = listScopeFor(user, request.nextUrl.searchParams.get("branchId") ?? undefined);
    return NextResponse.json({ suppliers: await listSuppliers(scope.shopId, scope.branchId) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJsonBody(request);
    const input = parseCreateSupplierInput(body);

    // A branch_admin can only add a supplier for their own branch; a shop_admin may name one.
    const requestedBranchId =
      typeof (body as { branchId?: unknown }).branchId === "string"
        ? (body as { branchId: string }).branchId
        : user.branchId;
    const branchId = user.role === "shop_admin" ? requestedBranchId : user.branchId;
    if (!branchId) {
      throw new ApiError(400, "A branch is required to add a supplier");
    }

    assertCanWriteSupplier(user, { shopId: user.shopId ?? "", branchId });

    // shopId comes from the session, never the payload.
    const supplier = await createSupplier({
      ...input,
      shopId: user.shopId as string,
      branchId,
      createdBy: user.id,
    });
    return NextResponse.json({ supplier }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
