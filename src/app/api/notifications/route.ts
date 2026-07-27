import { NextRequest, NextResponse } from "next/server";

import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";

import { requireUser, toErrorResponse, ApiError } from "@/lib/apiAuth";
import { db } from "@/lib/firebase";
import { logger } from "@/lib/logger";

export async function GET(_request: NextRequest) {
  try {
    // The owner is taken from the session, never from the request. Reading it
    // from a `userId` query parameter on an unauthenticated route let anyone
    // fetch anyone else's notifications; userIds are discoverable because
    // branch `members` entries embed them.
    const user = await requireUser();
    const userId = user.id;

    // Query notifications for the user
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const snapshot = await getDocs(notificationsQuery);
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
    }));

    // Calculate unread count
    const unreadCount = notifications.filter(
      (notification: any) => !notification.read
    ).length;

    return NextResponse.json({
      notifications,
      unreadCount,
    });

  } catch (error) {
    if (error instanceof ApiError) return toErrorResponse(error);

    logger.error("Error fetching notifications", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
