"use client";
import { useCallback, useEffect, useRef, useState } from "react";

import { logger } from "@/lib/logger";
import type { Notification } from "@/lib/notifications";

import { useUser } from "./useUser";

const POLL_INTERVAL_MS = 30_000;

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body.error || "Request failed";
  } catch {
    return `Request failed (${response.status})`;
  }
}

export function useNotifications() {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const refresh = useCallback(async () => {
    const seq = ++requestSeq.current;

    if (!user?.id) {
      if (seq === requestSeq.current) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
      }
      return;
    }

    try {
      setError(null);
      const response = await fetch("/api/notifications");
      if (!response.ok) throw new Error(await readError(response));

      const body = await response.json();
      if (seq !== requestSeq.current) return;

      setNotifications(Array.isArray(body?.notifications) ? body.notifications : []);
      setUnreadCount(typeof body?.unreadCount === "number" ? body.unreadCount : 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch notifications";
      if (seq !== requestSeq.current) return;
      setError(message);
      logger.error("Error fetching notifications", { error: message });
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    setLoading(true);
    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      if (!response.ok) throw new Error(await readError(response));

      // Drop in-flight poll responses so they cannot restore pre-mark state.
      requestSeq.current += 1;

      let shouldDecrement = false;
      setNotifications((prev) => {
        const target = prev.find((n) => n.id === notificationId);
        shouldDecrement = Boolean(target && !target.read);
        return prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n));
      });
      if (shouldDecrement) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to mark notification as read";
      logger.error("Error marking notification as read", { error: errorMessage, notificationId });
      setError(errorMessage);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch("/api/notifications/mark-read", { method: "POST" });
      if (!response.ok) throw new Error(await readError(response));

      // Drop in-flight poll responses so they cannot restore pre-mark state.
      requestSeq.current += 1;
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to mark all notifications as read";
      logger.error("Error marking all notifications as read", {
        error: errorMessage,
        userId: user.id,
      });
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
    refresh,
  };
}
