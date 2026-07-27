import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const whereMock = vi.fn((field: string, _op: string, value: unknown) => ({ field, value }));
const updateDocMock = vi.fn();

vi.mock("@/lib/apiAuth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/apiAuth")>("@/lib/apiAuth");
  return { ...actual, requireUser };
});

vi.mock("@/lib/firebase", () => ({ db: {} }));

vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, name: string) => ({ name }),
  doc: (_db: unknown, name: string, id: string) => ({ name, id }),
  query: (ref: unknown, ...constraints: unknown[]) => ({ ref, constraints }),
  where: (...args: [string, string, unknown]) => whereMock(...args),
  orderBy: () => ({ orderBy: true }),
  limit: () => ({ limit: true }),
  getDocs: async () => ({ docs: [], empty: true }),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
}));

const { GET } = await import("@/app/api/notifications/route");
const { POST } = await import("@/app/api/notifications/mark-read/route");

beforeEach(() => {
  vi.clearAllMocks();
  requireUser.mockResolvedValue({ id: "victim-safe-u1", role: "technician" });
});

/** The userId actually used in the Firestore `where("userId", ...)` filter. */
function queriedUserId() {
  return whereMock.mock.calls.find((c) => c[0] === "userId")?.[2];
}

describe("GET /api/notifications", () => {
  it("returns 401 without a session", async () => {
    const { ApiError } = await import("@/lib/apiAuth");
    requireUser.mockRejectedValue(new ApiError(401, "Not authenticated"));

    const response = await GET(
      new NextRequest("http://localhost/api/notifications?userId=victim")
    );

    expect(response.status).toBe(401);
  });

  it("reads the caller's own notifications, ignoring a userId query parameter", async () => {
    requireUser.mockResolvedValue({ id: "attacker-u2", role: "technician" });

    const response = await GET(
      new NextRequest("http://localhost/api/notifications?userId=victim-u1")
    );

    expect(response.status).toBe(200);
    expect(queriedUserId()).toBe("attacker-u2");
    expect(queriedUserId()).not.toBe("victim-u1");
  });

  it("works with no userId parameter at all", async () => {
    const response = await GET(new NextRequest("http://localhost/api/notifications"));

    expect(response.status).toBe(200);
    expect(queriedUserId()).toBe("victim-safe-u1");
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

    const response = await POST(request({ userId: "victim-u1" }));

    expect(response.status).toBe(401);
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it("marks the caller's own notifications, ignoring a userId in the body", async () => {
    requireUser.mockResolvedValue({ id: "attacker-u2", role: "technician" });

    const response = await POST(request({ userId: "victim-u1" }));

    expect(response.status).toBe(200);
    expect(queriedUserId()).toBe("attacker-u2");
    expect(queriedUserId()).not.toBe("victim-u1");
  });

  it("works with an empty body", async () => {
    const response = await POST(request({}));

    expect(response.status).toBe(200);
    expect(queriedUserId()).toBe("victim-safe-u1");
  });
});
