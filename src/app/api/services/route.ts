import { NextRequest, NextResponse } from "next/server";

import {
  ApiError,
  listScopeFor,
  readJsonBody,
  requireUser,
  toErrorResponse,
} from "@/lib/apiAuth";
import { assertWithinPlanLimit, getShopPlanFeatures } from "@/lib/planAccess";
import { createService, isVisibleToTechnician, listServices } from "@/lib/serviceRepo";
import { getTechnicianByUserId } from "@/lib/technicianRepo";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const scope = listScopeFor(
      user,
      request.nextUrl.searchParams.get("branchId") ?? undefined
    );

    let services = await listServices(scope);

    if (user.role === "technician") {
      const technician = await getTechnicianByUserId(user.id);
      services = services.filter((service) =>
        isVisibleToTechnician(service, user, technician?.id ?? null)
      );
    }

    return NextResponse.json({ services });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    if (!user.shopId) {
      throw new ApiError(403, "User is not associated with a shop");
    }

    const body = (await readJsonBody(request)) as {
      name?: string;
      description?: string;
      price?: number;
      branchId?: string;
      technician_id?: string;
      priority?: string;
      customer?: Record<string, unknown>;
      device?: Record<string, unknown>;
    };

    if (!body.name?.trim() || typeof body.price !== "number") {
      throw new ApiError(400, "Name and price are required");
    }

    let branchId = body.branchId || "";
    if (user.role === "technician" || user.role === "branch_admin") {
      if (!user.branchId) {
        throw new ApiError(403, "User is not associated with a branch");
      }
      branchId = user.branchId;
    }
    if (!branchId) {
      throw new ApiError(400, "Branch is required");
    }

    const features = await getShopPlanFeatures(user.shopId);
    if (features.maxServicesPerMonth !== null) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const shopServices = await listServices({ shopId: user.shopId });
      const servicesThisMonth = shopServices.filter((service) => new Date(service.createdAt) >= monthStart).length;
      assertWithinPlanLimit(
        servicesThisMonth,
        features.maxServicesPerMonth,
        `Your plan allows up to ${features.maxServicesPerMonth} service(s) per month. Upgrade your plan to add more.`
      );
    }

    const technicianId =
      body.technician_id ||
      (user.role === "technician" ? user.id : "");

    const service = await createService({
      shopId: user.shopId,
      branchId,
      name: body.name.trim(),
      description: body.description,
      price: body.price,
      technician_id: technicianId,
      priority: body.priority,
      customer: body.customer,
      device: body.device,
      created_by: {
        id: user.id,
        uid: user.id,
        role: user.role,
        name: user.name,
      },
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
