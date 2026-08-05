import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const listNotifications = vi.fn();
const markAllNotificationsRead = vi.fn();

vi.mock("@/lib/apiAuth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/apiAuth")>("@/lib/apiAuth");
  return { ...actual, requireUser };
});

vi.mock("@/lib/notificationRepo", () => ({
  listNotifications,
  markAllNotificationsRead,
}));

const { GET } = await import("@/app/api/notifications/route");
const { POST } = await import("@/app/api/notifications/mark-read/route");

beforeEach(() => {
  vi.clearAllMocks();
  requireUser.mockResolvedValue({ id: "victim-safe-u1", role: "technician" });
  listNotifications.mockResolvedValue({ notifications: [], unreadCount: 0 });
  markAllNotificationsRead.mockResolvedValue(0);
});

describe("GET /api/notifications", () => {
  it("returns 401 without a session", async () => {
    const { ApiError } = await import("@/lib/apiAuth");
    requireUser.mockRejectedValue(new ApiError(401, "Not authenticated"));

    const response = await GET();
    expect(response.status).toBe(401);
    expect(listNotifications).not.toHaveBeenCalled();
  });

  it("reads the caller's own notifications, ignoring a userId query parameter", async () => {
    requireUser.mockResolvedValue({ id: "attacker-u2", role: "technician" });

    const response = await GET();
    expect(response.status).toBe(200);
    expect(listNotifications).toHaveBeenCalledWith("attacker-u2");
  });

  it("works with no userId parameter at all", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(listNotifications).toHaveBeenCalledWith("victim-safe-u1");
  });
});

describe("POST /api/notifications/mark-read", () => {
  function request(body: unknown) {
    return new NextRequest("http://localhost/api/notifications/mark-read", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  it("returns 401 without a session", async () => {
    const { ApiError } = await import("@/lib/apiAuth");
    requireUser.mockRejectedValue(new ApiError(401, "Not authenticated"));

    const response = await POST(request({}));
    expect(response.status).toBe(401);
    expect(markAllNotificationsRead).not.toHaveBeenCalled();
  });

  it("marks the caller's own notifications, ignoring a userId in the body", async () => {
    requireUser.mockResolvedValue({ id: "attacker-u2", role: "technician" });

    const response = await POST(request({ userId: "victim-u1" }));
    expect(response.status).toBe(200);
    expect(markAllNotificationsRead).toHaveBeenCalledWith("attacker-u2");
  });

  it("works with an empty body", async () => {
    const response = await POST(request({}));
    expect(response.status).toBe(200);
    expect(markAllNotificationsRead).toHaveBeenCalledWith("victim-safe-u1");
  });
});
