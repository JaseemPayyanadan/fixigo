import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Query unread notifications for the user
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("read", "==", false)
    );

    const snapshot = await getDocs(notificationsQuery);
    
    // Mark all unread notifications as read
    const updatePromises = snapshot.docs.map(docSnapshot => 
      updateDoc(doc(db, "notifications", docSnapshot.id), {
        read: true,
        readAt: new Date(),
      })
    );

    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      message: "Notifications marked as read",
      updatedCount: snapshot.docs.length,
    });

  } catch (error) {
    logger.error("Error marking notifications as read", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}
