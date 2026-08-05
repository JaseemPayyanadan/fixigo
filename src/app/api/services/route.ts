import { NextRequest, NextResponse } from "next/server";

import { listScopeFor, requireUser, toErrorResponse } from "@/lib/apiAuth";
import { isVisibleToTechnician, listServices } from "@/lib/serviceRepo";
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
