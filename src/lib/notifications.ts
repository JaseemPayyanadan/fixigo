import type { Notification } from "@/lib/notificationRepo";

export type { Notification } from "@/lib/notificationRepo";

export interface NotificationPreferences {
  userId: string;
  email: boolean;
  push: boolean;
  sms: boolean;
  categories: {
    service: boolean;
    task: boolean;
    system: boolean;
    user: boolean;
  };
  updatedAt: Date;
}

/**
 * Client-facing helpers that talk to /api/notifications.
 * Do not query Firestore from the browser — rules require Firebase Auth,
 * and this app authenticates with a JWT session cookie instead.
 */
export class NotificationService {
  static async markAsRead(notificationId: string): Promise<void> {
    const response = await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(
        (body as { error?: string }).error || "Failed to mark notification as read"
      );
    }
  }

  static async markAllAsRead(): Promise<void> {
    const response = await fetch("/api/notifications/mark-read", { method: "POST" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(
        (body as { error?: string }).error || "Failed to mark all notifications as read"
      );
    }
  }

  /** @deprecated Use /api routes from the server; kept for call-site typing only. */
  static async createNotification(
    _notification: Omit<Notification, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    throw new Error("createNotification must run on the server via Admin SDK");
  }

  static async createServiceNotification(
    _userId: string,
    _serviceId: string,
    _action: "assigned" | "updated" | "completed" | "cancelled",
    _serviceName: string
  ): Promise<void> {
    throw new Error("createServiceNotification must run on the server via Admin SDK");
  }

  static async createSystemNotification(
    _userId: string,
    _title: string,
    _message: string,
    _type: "info" | "success" | "warning" | "error" = "info"
  ): Promise<void> {
    throw new Error("createSystemNotification must run on the server via Admin SDK");
  }
}
