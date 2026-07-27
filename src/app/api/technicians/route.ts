import { NextRequest, NextResponse } from "next/server";

import {
  ApiError,
  assertCanWriteTechnician,
  listScopeFor,
  readJsonBody,
  requireUser,
  toErrorResponse,
} from "@/lib/apiAuth";
import { createTechnician, emailExists, listTechnicians } from "@/lib/technicianRepo";
import { parseCreateInput } from "@/lib/technicianValidation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const scope = listScopeFor(
      user,
      request.nextUrl.searchParams.get("branchId") ?? undefined
    );

    return NextResponse.json({ technicians: await listTechnicians(scope) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const input = parseCreateInput(await readJsonBody(request));

    // shopId comes from the session, never the payload.
    assertCanWriteTechnician(user, {
      shopId: user.shopId ?? "",
      branchId: input.branchId,
    });

    if (await emailExists(input.email)) {
      throw new ApiError(400, "A user with this email already exists");
    }

    const technician = await createTechnician({
      ...input,
      shopId: user.shopId as string,
      createdBy: user.id,
    });

    return NextResponse.json({ technician }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
