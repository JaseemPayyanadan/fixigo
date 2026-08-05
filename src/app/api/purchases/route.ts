// src/app/api/purchases/route.ts
import { NextRequest, NextResponse } from "next/server";

import {
  ApiError,
  assertCanWritePurchase,
  listScopeFor,
  readJsonBody,
  requireUser,
  toErrorResponse,
} from "@/lib/apiAuth";
import {
  createPurchase,
  listPurchases,
  supplierInvoiceNoExists,
} from "@/lib/purchaseRepo";
import { summarizePurchases } from "@/lib/purchaseSummary";
import { parseCreatePurchaseInput } from "@/lib/purchaseValidation";
import { listSuppliers } from "@/lib/supplierRepo";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role === "technician") {
      throw new ApiError(403, "Not permitted to view purchases");
    }

    // listScopeFor already pins a non-shop-admin to their own branch.
    const scope = listScopeFor(user, request.nextUrl.searchParams.get("branchId") ?? undefined);

    const [purchases, suppliers] = await Promise.all([
      listPurchases(scope),
      listSuppliers(scope.shopId),
    ]);

    const serviceId = request.nextUrl.searchParams.get("serviceId");
    const scoped = serviceId
      ? purchases.filter((purchase) =>
          purchase.items.some((item) => item.serviceId === serviceId)
        )
      : purchases;

    const activeSuppliers = suppliers.filter((supplier) => supplier.status === "active").length;

    return NextResponse.json({
      purchases: scoped,
      summary: summarizePurchases(purchases, activeSuppliers, new Date()),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJsonBody(request);
    const input = parseCreatePurchaseInput(body);

    // A branch_admin can only buy for their own branch; a shop_admin may name one.
    const requestedBranchId =
      typeof (body as { branchId?: unknown }).branchId === "string"
        ? (body as { branchId: string }).branchId
        : user.branchId;

    const branchId = user.role === "shop_admin" ? requestedBranchId : user.branchId;
    if (!branchId) {
      throw new ApiError(400, "A branch is required to record a purchase");
    }

    assertCanWritePurchase(user, { shopId: user.shopId ?? "", branchId });

    const confirmDuplicate = (body as { confirmDuplicateInvoice?: unknown })
      .confirmDuplicateInvoice === true;

    let duplicateInvoiceWarning: string | undefined;
    if (input.supplierInvoiceNo) {
      const duplicate = await supplierInvoiceNoExists(
        user.shopId as string,
        input.supplierId,
        input.supplierInvoiceNo
      );
      if (duplicate && !confirmDuplicate) {
        // A warning the admin can override, not a hard error: genuine
        // duplicate bill numbers do occur.
        throw new ApiError(
          409,
          `Invoice ${input.supplierInvoiceNo} already exists for this supplier. Confirm to record it anyway.`
        );
      }
      if (duplicate) {
        duplicateInvoiceWarning = `Recorded despite a duplicate invoice number (${input.supplierInvoiceNo}).`;
      }
    }

    const purchase = await createPurchase({
      ...input,
      shopId: user.shopId as string,
      branchId,
      purchasedBy: { userId: user.id, name: user.name || "" },
    });

    return NextResponse.json({ purchase, duplicateInvoiceWarning }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
