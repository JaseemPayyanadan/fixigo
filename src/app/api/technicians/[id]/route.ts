import { NextRequest, NextResponse } from "next/server";

import {
  ApiError,
  assertCanReadTechnician,
  assertCanWriteTechnician,
  readJsonBody,
  requireUser,
  toErrorResponse,
} from "@/lib/apiAuth";
import {
  deactivateTechnician,
  emailExists,
  getTechnician,
  updateTechnician,
} from "@/lib/technicianRepo";
import { parseUpdateInput } from "@/lib/technicianValidation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

async function loadTechnician(id: string) {
  const technician = await getTechnician(id);
  if (!technician) throw new ApiError(404, "Technician not found");
  return technician;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const technician = await loadTechnician(id);

    assertCanReadTechnician(user, {
      shopId: technician.shopId,
      branchId: technician.branchId,
    });

    return NextResponse.json({ technician });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const technician = await loadTechnician(id);
    const input = parseUpdateInput(await readJsonBody(request));

    // Must be permitted on the current branch...
    assertCanWriteTechnician(user, {
      shopId: technician.shopId,
      branchId: technician.branchId,
    });

    // ...and on the destination branch when moving.
    if (input.branchId && input.branchId !== technician.branchId) {
      assertCanWriteTechnician(user, {
        shopId: technician.shopId,
        branchId: input.branchId,
      });
    }

    if (input.email && (await emailExists(input.email, technician.userId))) {
      throw new ApiError(400, "A user with this email already exists");
    }

    return NextResponse.json({ technician: await updateTechnician(id, input) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const technician = await loadTechnician(id);

    assertCanWriteTechnician(user, {
      shopId: technician.shopId,
      branchId: technician.branchId,
    });

    await deactivateTechnician(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
