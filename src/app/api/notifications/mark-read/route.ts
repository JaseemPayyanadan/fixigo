import { NextRequest, NextResponse } from "next/server";

import { readJsonBody, requireUser, toErrorResponse } from "@/lib/apiAuth";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notificationRepo";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();

    let notificationId: string | undefined;
    try {
      const body = (await readJsonBody(request)) as { notificationId?: unknown };
      if (typeof body?.notificationId === "string" && body.notificationId.trim()) {
        notificationId = body.notificationId.trim();
      }
    } catch {
      // Empty body = mark all
    }

    if (notificationId) {
      await markNotificationRead(notificationId, user.id);
      return NextResponse.json({ success: true, updatedCount: 1 });
    }

    const updatedCount = await markAllNotificationsRead(user.id);
    return NextResponse.json({
      success: true,
      message: "Notifications marked as read",
      updatedCount,
    });
  } catch (error) {
    const response = toErrorResponse(error);
    if (response.status >= 500) {
      logger.error("Error marking notifications as read", { error: String(error) });
    }
    return response;
  }
}
