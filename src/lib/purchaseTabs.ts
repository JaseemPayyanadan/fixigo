import type { Role } from "@/types";

export interface PurchaseTab {
  href: string;
  label: string;
}

export const PURCHASE_TABS: PurchaseTab[] = [
  { href: "/purchases/requests", label: "Purchase Requests" },
  { href: "/purchases", label: "Purchases" },
  { href: "/purchases/suppliers", label: "Suppliers" },
  { href: "/purchases/returns", label: "Returns" },
];

/** Technicians only ever see purchase requests; admins get the full strip. */
export function purchaseTabsForRole(role: Role | undefined): PurchaseTab[] {
  if (role === "technician") {
    return PURCHASE_TABS.filter((tab) => tab.href === "/purchases/requests");
  }
  return PURCHASE_TABS;
}
