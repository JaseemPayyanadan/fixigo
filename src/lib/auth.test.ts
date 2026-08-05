import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";

import { generateToken, verifyToken, type AuthUser } from "@/lib/auth";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

function sampleUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "user-1",
    uid: "user-1",
    email: "owner@shop.test",
    name: "Naseem",
    role: "shop_admin",
    shopId: "shop-1",
    onboardingCompleted: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("generateToken / verifyToken", () => {
  it("round-trips the user's name in the JWT payload", () => {
    const token = generateToken(sampleUser({ name: "Naseem" }));
    const decoded = verifyToken(token);

    expect(decoded).not.toBeNull();
    expect(decoded?.name).toBe("Naseem");
  });

  it("treats a legacy token without name as an empty string", () => {
    const legacy = jwt.sign(
      { id: "user-1", email: "owner@shop.test", role: "shop_admin", shopId: "shop-1" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    const decoded = verifyToken(legacy);
    expect(decoded?.name).toBe("");
  });
});
