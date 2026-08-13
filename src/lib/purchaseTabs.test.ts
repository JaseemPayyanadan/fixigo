import { describe, expect, it } from "vitest";

import { purchaseTabsForRole } from "@/lib/purchaseTabs";

describe("purchaseTabsForRole", () => {
  it("returns only Purchase Requests for technicians", () => {
    expect(purchaseTabsForRole("technician")).toEqual([
      { href: "/purchases/requests", label: "Purchase Requests" },
    ]);
  });

  it("returns all purchase tabs for shop admins", () => {
    expect(purchaseTabsForRole("shop_admin").map((tab) => tab.href)).toEqual([
      "/purchases/requests",
      "/purchases",
      "/purchases/suppliers",
      "/purchases/returns",
    ]);
  });

  it("returns all purchase tabs for branch admins", () => {
    expect(purchaseTabsForRole("branch_admin")).toHaveLength(4);
  });

  it("returns all tabs when role is unknown", () => {
    expect(purchaseTabsForRole(undefined)).toHaveLength(4);
  });
});
