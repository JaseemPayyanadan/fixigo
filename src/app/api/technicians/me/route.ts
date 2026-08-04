import { NextRequest, NextResponse } from "next/server";

import { ApiError, readJsonBody, requireUser, toErrorResponse } from "@/lib/apiAuth";
import { getTechnicianByUserId, updateTechnician } from "@/lib/technicianRepo";
import { parseUpdateInput } from "@/lib/technicianValidation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ technician: await getTechnicianByUserId(user.id) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    const technician = await getTechnicianByUserId(user.id);
    if (!technician) throw new ApiError(404, "No technician record for this account");

    const input = parseUpdateInput(await readJsonBody(request));

    // Self-service is limited to contact details.
    if (input.branchId !== undefined || input.status !== undefined) {
      throw new ApiError(403, "You cannot change your own branch or status");
    }

    return NextResponse.json({
      technician: await updateTechnician(technician.id, input),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
