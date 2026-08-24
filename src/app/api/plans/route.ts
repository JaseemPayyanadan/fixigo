import { NextResponse } from "next/server";

import { requireUser, toErrorResponse } from "@/lib/apiAuth";
import { listPlans } from "@/lib/planRepo";

export const dynamic = "force-dynamic";

/**
 * Global plan catalog — not scoped to a shop, so any signed-in user can read
 * it. No shop or user is assigned a plan yet; that assignment is a later step.
 */
export async function GET() {
  try {
    await requireUser();
    const plans = await listPlans();
    return NextResponse.json({ plans });
  } catch (error) {
    return toErrorResponse(error);
  }
}
