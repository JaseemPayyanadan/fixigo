import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const listNotifications = vi.fn();
const markAllNotificationsRead = vi.fn();
const markNotificationRead = vi.fn();

vi.mock("@/lib/apiAuth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/apiAuth")>("@/lib/apiAuth");
  return { ...actual, requireUser };
});

vi.mock("@/lib/notificationRepo", () => ({
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
}));

const { GET } = await import("@/app/api/notifications/route");
const { POST } = await import("@/app/api/notifications/mark-read/route");

beforeEach(() => {
  vi.clearAllMocks();
  requireUser.mockResolvedValue({ id: "victim-safe-u1", role: "technician" });
  listNotifications.mockResolvedValue({ notifications: [], unreadCount: 0 });
  markAllNotificationsRead.mockResolvedValue(0);
  markNotificationRead.mockResolvedValue(undefined);
});

describe("GET /api/notifications", () => {
  it("returns 401 without a session", async () => {
    const { ApiError } = await import("@/lib/apiAuth");
    requireUser.mockRejectedValue(new ApiError(401, "Not authenticated"));

    const response = await GET(new NextRequest("http://localhost/api/notifications"));
    expect(response.status).toBe(401);
    expect(listNotifications).not.toHaveBeenCalled();
  });

  it("reads the caller's own notifications, ignoring a userId query parameter", async () => {
    requireUser.mockResolvedValue({ id: "attacker-u2", role: "technician" });

    const response = await GET(
      new NextRequest("http://localhost/api/notifications?userId=victim-u1")
    );
    expect(response.status).toBe(200);
    expect(listNotifications).toHaveBeenCalledWith("attacker-u2");
    expect(listNotifications).not.toHaveBeenCalledWith("victim-u1");
  });

  it("works with no userId parameter at all", async () => {
    const response = await GET(new NextRequest("http://localhost/api/notifications"));
    expect(response.status).toBe(200);
    expect(listNotifications).toHaveBeenCalledWith("victim-safe-u1");
  });
});

describe("POST /api/notifications/mark-read", () => {
  function request(body?: unknown) {
    if (body === undefined) {
      return new NextRequest("http://localhost/api/notifications/mark-read", {
        method: "POST",
      });
    }
    return new NextRequest("http://localhost/api/notifications/mark-read", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
  }

  it("returns 401 without a session", async () => {
    const { ApiError } = await import("@/lib/apiAuth");
    requireUser.mockRejectedValue(new ApiError(401, "Not authenticated"));

    const response = await POST(request({}));
    expect(response.status).toBe(401);
    expect(markAllNotificationsRead).not.toHaveBeenCalled();
    expect(markNotificationRead).not.toHaveBeenCalled();
  });

  it("marks the caller's own notifications, ignoring a userId in the body", async () => {
    requireUser.mockResolvedValue({ id: "attacker-u2", role: "technician" });

    const response = await POST(request({ userId: "victim-u1" }));
    expect(response.status).toBe(200);
    expect(markAllNotificationsRead).toHaveBeenCalledWith("attacker-u2");
    expect(markNotificationRead).not.toHaveBeenCalled();
  });

  it("works with an empty body", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(markAllNotificationsRead).toHaveBeenCalledWith("victim-safe-u1");
  });

  it("marks a single notification when notificationId is provided", async () => {
    const response = await POST(request({ notificationId: "n1" }));
    expect(response.status).toBe(200);
    expect(markNotificationRead).toHaveBeenCalledWith("n1", "victim-safe-u1");
    expect(markAllNotificationsRead).not.toHaveBeenCalled();
  });

  it("returns 403 when the repo refuses ownership", async () => {
    const { ApiError } = await import("@/lib/apiAuth");
    markNotificationRead.mockRejectedValue(
      new ApiError(403, "Not permitted to update this notification")
    );

    const response = await POST(request({ notificationId: "n1" }));
    expect(response.status).toBe(403);
  });

  it("returns 404 when the notification is missing", async () => {
    const { ApiError } = await import("@/lib/apiAuth");
    markNotificationRead.mockRejectedValue(new ApiError(404, "Notification not found"));

    const response = await POST(request({ notificationId: "missing" }));
    expect(response.status).toBe(404);
  });

  it("returns 400 for invalid JSON", async () => {
    const response = await POST(request("not-json"));
    expect(response.status).toBe(400);
    expect(markAllNotificationsRead).not.toHaveBeenCalled();
    expect(markNotificationRead).not.toHaveBeenCalled();
  });
});
