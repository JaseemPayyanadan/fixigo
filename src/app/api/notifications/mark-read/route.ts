import { NextRequest, NextResponse } from "next/server";

import { ApiError, requireUser, toErrorResponse } from "@/lib/apiAuth";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notificationRepo";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

function parseMarkReadBody(raw: string): string | undefined {
  if (!raw.trim()) {
    return undefined;
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new ApiError(400, "Request body must be valid JSON");
  }

  if (
    body &&
    typeof body === "object" &&
    typeof (body as { notificationId?: unknown }).notificationId === "string" &&
    (body as { notificationId: string }).notificationId.trim()
  ) {
    return (body as { notificationId: string }).notificationId.trim();
  }

  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const notificationId = parseMarkReadBody(await request.text());

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
