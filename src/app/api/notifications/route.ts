import { NextResponse } from "next/server";

import { requireUser, toErrorResponse } from "@/lib/apiAuth";
import { listNotifications } from "@/lib/notificationRepo";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Owner comes from the session only — never from a userId query param.
    const user = await requireUser();
    const result = await listNotifications(user.id);

    return NextResponse.json(result);
  } catch (error) {
    const response = toErrorResponse(error);
    if (response.status >= 500) {
      logger.error("Error fetching notifications", { error: String(error) });
    }
    return response;
  }
}
