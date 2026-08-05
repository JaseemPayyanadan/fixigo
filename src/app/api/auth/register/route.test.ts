import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const registerUser = vi.fn();
const generateToken = vi.fn(() => "signed-token");
const cookieSet = vi.fn();

vi.mock("@/lib/auth", () => ({ generateToken }));
vi.mock("@/lib/authUsers", () => ({ registerUser }));
vi.mock("@/lib/firebaseCustomToken", () => ({ mintCustomTokenForUser: vi.fn(async () => "custom-token") }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: cookieSet }),
}));

const { POST } = await import("@/app/api/auth/register/route");

function request(body: unknown) {
  return new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  registerUser.mockResolvedValue({
    id: "u1",
    name: "Owner",
    email: "owner@example.com",
    role: "shop_admin",
  });
});

describe("POST /api/auth/register", () => {
  it("allows the intended public signup role, shop_admin", async () => {
    const response = await POST(
      request({
        name: "Owner",
        email: "owner@example.com",
        password: "pw",
        role: "shop_admin",
      })
    );

    expect(response.status).toBe(200);
    expect(registerUser).toHaveBeenCalledWith(
      expect.objectContaining({ role: "shop_admin" })
    );
    expect(cookieSet).toHaveBeenCalled();
  });

  // Self-service signup provisions shop owners only. branch_admin and
  // technician accounts are created by an authenticated admin through the
  // technician/branch APIs, which scope them to a shop and branch. Minting
  // one here would produce a privileged role with no shop or branch binding
  // and no admin ever having authorised it.
  it.each(["branch_admin", "technician"])(
    "rejects self-registration as %s without creating a user or a session",
    async (role) => {
      const response = await POST(
        request({ name: "X", email: "x@example.com", password: "pw", role })
      );

      expect(response.status).toBe(400);
      expect(registerUser).not.toHaveBeenCalled();
      expect(cookieSet).not.toHaveBeenCalled();
    }
  );

  it.each(["superadmin", "admin", "", "SHOP_ADMIN", "shop_admin "])(
    "rejects the unrecognised role %j rather than persisting it",
    async (role) => {
      const response = await POST(
        request({ name: "X", email: "x@example.com", password: "pw", role })
      );

      expect(response.status).toBe(400);
      expect(registerUser).not.toHaveBeenCalled();
      expect(cookieSet).not.toHaveBeenCalled();
    }
  );

  it("rejects a non-string role rather than passing it through to Firestore", async () => {
    const response = await POST(
      request({
        name: "X",
        email: "x@example.com",
        password: "pw",
        role: { toString: "shop_admin" },
      })
    );

    expect(response.status).toBe(400);
    expect(registerUser).not.toHaveBeenCalled();
  });
});
