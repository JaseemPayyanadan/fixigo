import { NextRequest, NextResponse } from "next/server";

import {
  ApiError,
  readJsonBody,
  requireUser,
  toErrorResponse,
} from "@/lib/apiAuth";
import {
  assertCanAccessService,
  deleteService,
  getService,
  setServicePaymentAdmin,
  updateService,
} from "@/lib/serviceRepo";
import type { StatusHistoryEntry } from "@/types";

export const dynamic = "force-dynamic";

function requireShopId(user: { shopId?: string }): string {
  if (!user.shopId) {
    throw new ApiError(403, "User is not associated with a shop");
  }
  return user.shopId;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const service = await getService(id);
    if (!service) {
      throw new ApiError(404, "Service not found");
    }
    await assertCanAccessService(user, service);
    return NextResponse.json({ service });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const shopId = requireShopId(user);
    const { id } = await context.params;

    const existing = await getService(id);
    if (!existing) {
      throw new ApiError(404, "Service not found");
    }
    await assertCanAccessService(user, existing);

    const body = (await readJsonBody(request)) as {
      action?: "update" | "payment";
      fields?: Record<string, unknown>;
      statusHistoryAppend?: StatusHistoryEntry;
      deleteFields?: string[];
      /** @deprecated Prefer paymentStatus. Kept for older clients. */
      paid?: boolean;
      paymentStatus?: "pending" | "partial" | "paid";
      paidAmount?: number;
    };

    if (body.action === "payment") {
      let paymentStatus = body.paymentStatus;
      if (!paymentStatus && typeof body.paid === "boolean") {
        paymentStatus = body.paid ? "paid" : "pending";
      }
      if (paymentStatus !== "pending" && paymentStatus !== "partial" && paymentStatus !== "paid") {
        throw new ApiError(400, "paymentStatus must be pending, partial, or paid");
      }
      if (paymentStatus === "partial") {
        if (typeof body.paidAmount !== "number" || !(body.paidAmount > 0)) {
          throw new ApiError(400, "paidAmount must be a positive number for partial payment");
        }
      }
      const write = await setServicePaymentAdmin(id, shopId, {
        paymentStatus,
        paidAmount: body.paidAmount,
      });
      const service = await getService(id);
      return NextResponse.json({ service, payment: write });
    }

    const service = await updateService(id, shopId, {
      fields: body.fields,
      statusHistoryAppend: body.statusHistoryAppend,
      deleteFields: body.deleteFields,
    });

    return NextResponse.json({ service });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const shopId = requireShopId(user);

    if (user.role === "technician") {
      throw new ApiError(403, "Technicians cannot delete services");
    }

    const { id } = await context.params;
    const existing = await getService(id);
    if (!existing) {
      throw new ApiError(404, "Service not found");
    }
    await assertCanAccessService(user, existing);
    await deleteService(id, shopId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
