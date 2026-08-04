import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Written = Record<string, unknown>;

const requireUser = vi.fn();
const setDocMock = vi.fn((_ref: unknown, _data: Written) => undefined);
const addDocMock = vi.fn(async (_ref: unknown, _data: Written) => ({ id: "branch-new" }));
const getDocsMock = vi.fn(async () => ({ empty: true, docs: [] }));

vi.mock("@/lib/apiAuth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/apiAuth")>("@/lib/apiAuth");
  return { ...actual, requireUser };
});

vi.mock("@/lib/firebase", () => ({ db: {} }));

vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, name: string) => ({ name }),
  doc: () => ({ id: "user-new" }),
  query: (ref: unknown, ...constraints: unknown[]) => ({ ref, constraints }),
  where: (field: string, _op: string, value: unknown) => ({ field, value }),
  setDoc: (ref: unknown, data: Written) => setDocMock(ref, data),
  addDoc: (ref: unknown, data: Written) => addDocMock(ref, data),
  getDocs: () => getDocsMock(),
}));

const { POST } = await import("@/app/api/branches/create/route");

const validBody = {
  name: "North Branch",
  location: "Kochi",
  phone: "111",
  email: "north@example.com",
  password: "pw",
};

function request(body: unknown) {
  return new NextRequest("http://localhost/api/branches/create", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getDocsMock.mockResolvedValue({ empty: true, docs: [] });
  requireUser.mockResolvedValue({ id: "u1", role: "shop_admin", shopId: "shop-1" });
});

describe("POST /api/branches/create", () => {
  it("returns 401 and writes nothing without a session", async () => {
    const { ApiError } = await import("@/lib/apiAuth");
    requireUser.mockRejectedValue(new ApiError(401, "Not authenticated"));

    const response = await POST(request({ ...validBody, shopId: "shop-1" }));

    expect(response.status).toBe(401);
    expect(setDocMock).not.toHaveBeenCalled();
    expect(addDocMock).not.toHaveBeenCalled();
  });

  // Creating a branch mints a branch_admin login with a caller-chosen
  // password, so it is a shop-owner action, not something a branch_admin or
  // technician may do for themselves.
  it.each(["branch_admin", "technician"])(
    "returns 403 and writes nothing for role %s",
    async (role) => {
      requireUser.mockResolvedValue({ id: "u1", role, shopId: "shop-1" });

      const response = await POST(request({ ...validBody, shopId: "shop-1" }));

      expect(response.status).toBe(403);
      expect(setDocMock).not.toHaveBeenCalled();
      expect(addDocMock).not.toHaveBeenCalled();
    }
  );

  it("ignores a body shopId naming another shop and uses the session's shop", async () => {
    requireUser.mockResolvedValue({ id: "u1", role: "shop_admin", shopId: "shop-1" });

    const response = await POST(request({ ...validBody, shopId: "shop-2" }));

    expect(response.status).toBe(200);

    const userWrite = setDocMock.mock.calls[0]?.[1];
    expect(userWrite.shopId).toBe("shop-1");

    const branchWrite = addDocMock.mock.calls[0]?.[1];
    expect(branchWrite.shopId).toBe("shop-1");
  });

  it("succeeds for a shop_admin without any shopId in the body", async () => {
    const response = await POST(request(validBody));

    expect(response.status).toBe(200);
    const branchWrite = addDocMock.mock.calls[0]?.[1];
    expect(branchWrite.shopId).toBe("shop-1");
  });

  it("returns 403 when the session carries no shopId", async () => {
    requireUser.mockResolvedValue({ id: "u1", role: "shop_admin" });

    const response = await POST(request({ ...validBody, shopId: "shop-2" }));

    expect(response.status).toBe(403);
    expect(addDocMock).not.toHaveBeenCalled();
  });
});
