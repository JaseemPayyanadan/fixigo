import { NextResponse } from "next/server";

import { ApiError, requireUser, toErrorResponse } from "@/lib/apiAuth";
import { listBranches } from "@/lib/branchRepo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    if (!user.shopId) {
      throw new ApiError(403, "User is not associated with a shop");
    }

    // shopId comes from the session only — never from the query string.
    return NextResponse.json({ branches: await listBranches(user.shopId) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
