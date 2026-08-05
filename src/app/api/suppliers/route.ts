import { NextRequest, NextResponse } from "next/server";

import {
  assertCanManageSuppliers,
  readJsonBody,
  requireUser,
  toErrorResponse,
} from "@/lib/apiAuth";
import { parseCreateSupplierInput } from "@/lib/purchaseValidation";
import { createSupplier, listSuppliers } from "@/lib/supplierRepo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const shopId = assertCanManageSuppliers(user);
    return NextResponse.json({ suppliers: await listSuppliers(shopId) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const shopId = assertCanManageSuppliers(user);
    const input = parseCreateSupplierInput(await readJsonBody(request));

    // shopId comes from the session, never the payload.
    const supplier = await createSupplier({ ...input, shopId, createdBy: user.id });
    return NextResponse.json({ supplier }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
