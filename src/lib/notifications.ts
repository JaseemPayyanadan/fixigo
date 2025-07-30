import { addDoc, collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { logger } from "./logger";
import type { User } from "@/types";

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  category: "service" | "invoice" | "task" | "system" | "user";
  read: boolean;
  actionUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreferences {
  userId: string;
  email: boolean;
  push: boolean;
  sms: boolean;
  categories: {
    service: boolean;
    invoice: boolean;
    task: boolean;
    system: boolean;
    user: boolean;
  };
  updatedAt: Date;
}

export class NotificationService {
  /**
   * Create a new notification
   */
  static async createNotification(notification: Omit<Notification, "id" | "createdAt" | "updatedAt">): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, "notifications"), {
        ...notification,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      logger.info("Notification created", { 
        notificationId: docRef.id, 
        userId: notification.userId,
        type: notification.type,
        category: notification.category
      });
      
      return docRef.id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create notification";
      logger.error("Error creating notification", { error: errorMessage, notification: JSON.stringify(notification) });
      throw new Error(errorMessage);
    }
  }

  /**
   * Create notifications for multiple users
   */
  static async createBulkNotifications(
    userIds: string[],
    notification: Omit<Notification, "id" | "userId" | "createdAt" | "updatedAt">
  ): Promise<void> {
    try {
      const notifications = userIds.map(userId => ({
        ...notification,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const batch = notifications.map(notification => 
        addDoc(collection(db, "notifications"), notification)
      );

      await Promise.all(batch);
      
      logger.info("Bulk notifications created", { 
        count: userIds.length,
        type: notification.type,
        category: notification.category
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create bulk notifications";
      logger.error("Error creating bulk notifications", { error: errorMessage, userIds: JSON.stringify(userIds) });
      throw new Error(errorMessage);
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        read: true,
        updatedAt: new Date(),
      });
      
      logger.info("Notification marked as read", { notificationId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to mark notification as read";
      logger.error("Error marking notification as read", { error: errorMessage, notificationId });
      throw new Error(errorMessage);
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      const notificationsQuery = query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        where("read", "==", false)
      );
      
      const snapshot = await getDocs(notificationsQuery);
      const batch = snapshot.docs.map(doc => 
        updateDoc(doc.ref, { read: true, updatedAt: new Date() })
      );
      
      await Promise.all(batch);
      
      logger.info("All notifications marked as read", { userId, count: snapshot.docs.length });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to mark all notifications as read";
      logger.error("Error marking all notifications as read", { error: errorMessage, userId });
      throw new Error(errorMessage);
    }
  }

  /**
   * Get notifications for a user with real-time updates
   */
  static subscribeToNotifications(
    userId: string,
    callback: (notifications: Notification[]) => void
  ): () => void {
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(notificationsQuery, (snapshot) => {
      const notifications: Notification[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Notification[];

      callback(notifications);
    });
  }

  /**
   * Get unread notification count
   */
  static subscribeToUnreadCount(
    userId: string,
    callback: (count: number) => void
  ): () => void {
    const unreadQuery = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("read", "==", false)
    );

    return onSnapshot(unreadQuery, (snapshot) => {
      callback(snapshot.docs.length);
    });
  }

  /**
   * Create service-related notifications
   */
  static async createServiceNotification(
    userId: string,
    serviceId: string,
    action: "assigned" | "updated" | "completed" | "cancelled",
    serviceName: string
  ): Promise<void> {
    const notifications = {
      assigned: {
        title: "New Service Assigned",
        message: `You have been assigned to service: ${serviceName}`,
        type: "info" as const,
      },
      updated: {
        title: "Service Updated",
        message: `Service "${serviceName}" has been updated`,
        type: "info" as const,
      },
      completed: {
        title: "Service Completed",
        message: `Service "${serviceName}" has been completed`,
        type: "success" as const,
      },
      cancelled: {
        title: "Service Cancelled",
        message: `Service "${serviceName}" has been cancelled`,
        type: "warning" as const,
      },
    };

    const notification = notifications[action];
    
    await this.createNotification({
      userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      category: "service",
      read: false,
      actionUrl: `/services/${serviceId}`,
    });
  }

  /**
   * Create invoice-related notifications
   */
  static async createInvoiceNotification(
    userId: string,
    invoiceId: string,
    action: "created" | "paid" | "overdue",
    amount: number
  ): Promise<void> {
    const notifications = {
      created: {
        title: "New Invoice Created",
        message: `Invoice for $${amount} has been created`,
        type: "info" as const,
      },
      paid: {
        title: "Invoice Paid",
        message: `Invoice for $${amount} has been paid`,
        type: "success" as const,
      },
      overdue: {
        title: "Invoice Overdue",
        message: `Invoice for $${amount} is overdue`,
        type: "warning" as const,
      },
    };

    const notification = notifications[action];
    
    await this.createNotification({
      userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      category: "invoice",
      read: false,
      actionUrl: `/invoices/${invoiceId}`,
    });
  }

  /**
   * Create system notifications
   */
  static async createSystemNotification(
    userId: string,
    title: string,
    message: string,
    type: "info" | "success" | "warning" | "error" = "info"
  ): Promise<void> {
    await this.createNotification({
      userId,
      title,
      message,
      type,
      category: "system",
      read: false,
    });
  }
} 