import { ApiError } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";

export const NOTIFICATIONS = "notifications";
const FIRESTORE_BATCH_LIMIT = 500;

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
  // List is limited server-side; unread uses a separate equality query so the
  // badge stays accurate without loading the full history into memory.
  // Requires indexes: userId+createdAt and userId+read (userId+read+createdAt exists).
  const [listSnap, unreadSnap] = await Promise.all([
    adminDb
      .collection(NOTIFICATIONS)
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(max)
      .get(),
    adminDb
      .collection(NOTIFICATIONS)
      .where("userId", "==", userId)
      .where("read", "==", false)
      .get(),
  ]);

  const notifications = listSnap.docs.map((docSnap) =>
    mapNotification(docSnap.id, docSnap.data() as Record<string, unknown>)
  );

  return { notifications, unreadCount: unreadSnap.size };
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const snapshot = await adminDb
    .collection(NOTIFICATIONS)
    .where("userId", "==", userId)
    .where("read", "==", false)
    .get();

  const now = new Date();
  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += FIRESTORE_BATCH_LIMIT) {
    const chunk = docs.slice(i, i + FIRESTORE_BATCH_LIMIT);
    const batch = adminDb.batch();
    for (const docSnap of chunk) {
      batch.update(docSnap.ref, { read: true, readAt: now, updatedAt: now });
    }
    await batch.commit();
  }

  return docs.length;
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
