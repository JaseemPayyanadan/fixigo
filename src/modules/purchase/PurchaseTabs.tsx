"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useUser } from "@/hooks";
import { purchaseTabsForRole } from "@/lib/purchaseTabs";

/** Switches between the purchase requests, purchases, suppliers, and returns lists. */
export default function PurchaseTabs() {
  const pathname = usePathname();
  const { user } = useUser();
  const tabs = purchaseTabsForRole(user?.role);

  // Technicians only have one destination — hide a useless single-tab strip.
  if (tabs.length <= 1) return null;

  const onRequests = pathname.startsWith("/purchases/requests");
  const onSuppliers = pathname.startsWith("/purchases/suppliers");
  const onReturns = pathname.startsWith("/purchases/returns");
  const onPurchases = !onRequests && !onSuppliers && !onReturns;

  return (
    <div className="flex gap-4 border-b border-gray-200" role="tablist" aria-label="Purchases sections">
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/purchases/requests"
            ? onRequests
            : tab.href === "/purchases/suppliers"
              ? onSuppliers
              : tab.href === "/purchases/returns"
                ? onReturns
                : onPurchases;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={isActive}
            className={`-mb-px border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
              isActive
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
