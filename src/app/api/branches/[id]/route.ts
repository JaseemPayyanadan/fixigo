import { NextRequest, NextResponse } from "next/server";

import {
  ApiError,
  readJsonBody,
  requireUser,
  toErrorResponse,
} from "@/lib/apiAuth";
import { deleteBranch, getBranch, updateBranch } from "@/lib/branchRepo";
import type { Branch } from "@/types";

export const dynamic = "force-dynamic";

function assertCanManageBranches(user: { role: string; shopId?: string }): string {
  if (user.role !== "shop_admin") {
    throw new ApiError(403, "Only a shop admin can modify branches");
  }
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
    if (!user.shopId) {
      throw new ApiError(403, "User is not associated with a shop");
    }
    const { id } = await context.params;
    const branch = await getBranch(id);
    if (!branch || branch.shopId !== user.shopId) {
      throw new ApiError(404, "Branch not found");
    }
    return NextResponse.json({ branch });
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
    const shopId = assertCanManageBranches(user);
    const { id } = await context.params;
    const body = (await readJsonBody(request)) as Partial<Branch>;

    const branch = await updateBranch(id, shopId, {
      name: body.name,
      location: body.location,
      phone: body.phone,
      email: body.email,
      status: body.status,
      managerName: body.managerName,
      managerPhone: body.managerPhone,
      managerEmail: body.managerEmail,
    });

    return NextResponse.json({ branch });
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
    const shopId = assertCanManageBranches(user);
    const { id } = await context.params;

    await deleteBranch(id, shopId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
