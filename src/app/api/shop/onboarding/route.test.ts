import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Written = Record<string, unknown>;

const verifyToken = vi.fn();
const getUserById = vi.fn();
const setDocMock = vi.fn((_ref: unknown, _data: Written) => undefined);
const updateDocMock = vi.fn((_ref: unknown, _data: Written) => undefined);
const cookieGet = vi.fn(() => ({ value: "token" }));

vi.mock("next/headers", () => ({ cookies: async () => ({ get: cookieGet }) }));
vi.mock("@/lib/auth", () => ({ verifyToken, getUserById }));
vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, name: string) => ({ name }),
  doc: () => ({ id: "shop-new" }),
  setDoc: (ref: unknown, data: Written) => setDocMock(ref, data),
  updateDoc: (ref: unknown, data: Written) => updateDocMock(ref, data),
}));

const { POST } = await import("@/app/api/shop/onboarding/route");

const validBody = {
  shopName: "Fixigo Kochi",
  ownerName: "Owner",
  email: "owner@example.com",
  phone: "111",
  address: "1 Road",
  city: "Kochi",
  pinCode: "682001",
};

function request(body: unknown = validBody) {
  return new NextRequest("http://localhost/api/shop/onboarding", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  cookieGet.mockReturnValue({ value: "token" });
  verifyToken.mockReturnValue({ id: "u1" });
  // A fresh shop owner mid-signup: correct role, no shop yet.
  getUserById.mockResolvedValue({ id: "u1", role: "shop_admin", shopId: undefined });
});

describe("POST /api/shop/onboarding", () => {
  it("lets a shop_admin with no shop complete onboarding", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(setDocMock).toHaveBeenCalled();
    expect(updateDocMock).toHaveBeenCalled();
  });

  // Onboarding is the shop-owner signup step. Any other role already belongs
  // to a shop created by someone else; letting them run it would mint an
  // unauthorised shop and silently move them out of their current one.
  it.each(["branch_admin", "technician"])(
    "returns 403 for role %s and creates no shop",
    async (role) => {
      getUserById.mockResolvedValue({ id: "u1", role, shopId: "shop-1" });

      const response = await POST(request());

      expect(response.status).toBe(403);
      expect(setDocMock).not.toHaveBeenCalled();
      expect(updateDocMock).not.toHaveBeenCalled();
    }
  );

  it("returns 409 when the caller already has a shop, leaving the existing shopId intact", async () => {
    getUserById.mockResolvedValue({ id: "u1", role: "shop_admin", shopId: "shop-existing" });

    const response = await POST(request());

    expect(response.status).toBe(409);
    expect(setDocMock).not.toHaveBeenCalled();
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  // The role/shop check must read the stored user record, not the JWT, since
  // a token issued before onboarding still carries no shopId.
  it("rejects on the stored record even when the token looks eligible", async () => {
    verifyToken.mockReturnValue({ id: "u1", role: "shop_admin", shopId: undefined });
    getUserById.mockResolvedValue({ id: "u1", role: "technician", shopId: "shop-1" });

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it("still returns 401 without a session", async () => {
    cookieGet.mockReturnValue(undefined as never);

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(setDocMock).not.toHaveBeenCalled();
  });
});
