import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/apiAuth";
import { parseCreateInput, parseUpdateInput } from "@/lib/technicianValidation";

const valid = {
  name: "Anshid",
  email: "anshid@example.com",
  phone: "9876543210",
  password: "secret123",
  branchId: "branch-1",
};

describe("parseCreateInput", () => {
  it("accepts and trims a valid payload", () => {
    expect(parseCreateInput({ ...valid, name: "  Anshid  " })).toEqual(valid);
  });

  it.each(["name", "email", "phone", "password", "branchId"])(
    "rejects a missing %s",
    (field) => {
      const body = { ...valid, [field]: undefined };
      expect(() => parseCreateInput(body)).toThrow(ApiError);
    }
  );

  it("rejects a malformed email", () => {
    expect(() => parseCreateInput({ ...valid, email: "not-an-email" })).toThrow(ApiError);
  });

  it("rejects a password under 6 characters", () => {
    expect(() => parseCreateInput({ ...valid, password: "12345" })).toThrow(ApiError);
  });

  it("lowercases the email so uniqueness checks are case-insensitive", () => {
    expect(parseCreateInput({ ...valid, email: "Anshid@Example.COM" }).email).toBe(
      "anshid@example.com"
    );
  });

  it("ignores a client-supplied shopId", () => {
    const parsed = parseCreateInput({ ...valid, shopId: "attacker-shop" });
    expect(parsed).not.toHaveProperty("shopId");
  });

  it("ignores a client-supplied role", () => {
    const parsed = parseCreateInput({ ...valid, role: "shop_admin" });
    expect(parsed).not.toHaveProperty("role");
  });

  it("throws 400 for a bad payload", () => {
    try {
      parseCreateInput({});
      expect.unreachable("should have thrown");
    } catch (error) {
      expect((error as ApiError).status).toBe(400);
    }
  });
});

describe("parseUpdateInput", () => {
  it("accepts a partial payload", () => {
    expect(parseUpdateInput({ name: "New Name" })).toEqual({ name: "New Name" });
  });

  it("omits absent fields rather than setting them undefined", () => {
    expect(Object.keys(parseUpdateInput({ phone: "123" }))).toEqual(["phone"]);
  });

  it("accepts branchId and status, which the old edit form discarded", () => {
    expect(parseUpdateInput({ branchId: "branch-2", status: "inactive" })).toEqual({
      branchId: "branch-2",
      status: "inactive",
    });
  });

  it("rejects an invalid status", () => {
    expect(() => parseUpdateInput({ status: "busy" })).toThrow(ApiError);
  });

  it("rejects an empty payload", () => {
    expect(() => parseUpdateInput({})).toThrow(ApiError);
  });

  it("rejects a malformed email", () => {
    expect(() => parseUpdateInput({ email: "nope" })).toThrow(ApiError);
  });
});
