import { ApiError } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";

export const NOTIFICATIONS = "notifications";

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  category: "service" | "task" | "system" | "user";
  read: boolean;
  actionUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

export function mapNotification(id: string, data: Record<string, unknown>): Notification {
  return {
    id,
    userId: (data.userId as string) || "",
    title: (data.title as string) || "",
    message: (data.message as string) || "",
    type: (data.type as Notification["type"]) || "info",
    category: (data.category as Notification["category"]) || "system",
    read: Boolean(data.read),
    actionUrl: data.actionUrl as string | undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function listNotifications(
  userId: string,
  max = 50
): Promise<{ notifications: Notification[]; unreadCount: number }> {
  // No orderBy/limit in the query: without a composite index, limit would be
  // arbitrary and unreadCount would be wrong. Sort + slice in memory instead.
  const snapshot = await adminDb
    .collection(NOTIFICATIONS)
    .where("userId", "==", userId)
    .get();

  const all = snapshot.docs.map((docSnap) =>
    mapNotification(docSnap.id, docSnap.data() as Record<string, unknown>)
  );
  const unreadCount = all.filter((n) => !n.read).length;
  const notifications = all
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, max);

  return { notifications, unreadCount };
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const snapshot = await adminDb
    .collection(NOTIFICATIONS)
    .where("userId", "==", userId)
    .where("read", "==", false)
    .get();

  const now = new Date();
  await Promise.all(
    snapshot.docs.map((docSnap) =>
      docSnap.ref.update({ read: true, readAt: now, updatedAt: now })
    )
  );

  return snapshot.docs.length;
}

export async function markNotificationRead(
  notificationId: string,
  userId: string
): Promise<void> {
  const ref = adminDb.collection(NOTIFICATIONS).doc(notificationId);
  const existing = await ref.get();
  if (!existing.exists) {
    throw new ApiError(404, "Notification not found");
  }

  const data = existing.data() as Record<string, unknown>;
  if (data.userId !== userId) {
    throw new ApiError(403, "Not permitted to update this notification");
  }

  const now = new Date();
  await ref.update({ read: true, readAt: now, updatedAt: now });
}
