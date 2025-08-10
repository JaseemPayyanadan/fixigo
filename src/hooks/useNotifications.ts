"use client";
import { useState, useEffect } from "react";

import { logger } from "@/lib/logger";
import { NotificationService, type Notification } from "@/lib/notifications";

import { useUser } from "./useUser";

export function useNotifications() {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Subscribe to notifications
    const unsubscribeNotifications = NotificationService.subscribeToNotifications(
      user.id,
      (notifications) => {
        setNotifications(notifications);
        setLoading(false);
      }
    );

    // Subscribe to unread count
    const unsubscribeUnreadCount = NotificationService.subscribeToUnreadCount(
      user.id,
      (count) => {
        setUnreadCount(count);
      }
    );

    return () => {
      unsubscribeNotifications();
      unsubscribeUnreadCount();
    };
  }, [user?.id]);

  const markAsRead = async (notificationId: string) => {
    try {
      await NotificationService.markAsRead(notificationId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to mark notification as read";
      logger.error("Error marking notification as read", { error: errorMessage, notificationId });
      setError(errorMessage);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      await NotificationService.markAllAsRead(user.id);
      setUnreadCount(0);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to mark all notifications as read";
      logger.error("Error marking all notifications as read", { error: errorMessage, userId: user.id });
      setError(errorMessage);
    }
  };

  const createNotification = async (
    notification: Omit<Notification, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      await NotificationService.createNotification(notification);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create notification";
      logger.error("Error creating notification", { error: errorMessage });
      setError(errorMessage);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    createNotification,
  };
}
