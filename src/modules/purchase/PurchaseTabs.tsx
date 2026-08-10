"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/purchases", label: "Purchases" },
  { href: "/purchases/suppliers", label: "Suppliers" },
  { href: "/purchases/returns", label: "Returns" },
];

/** Switches between the purchases list, suppliers list, and returns list. */
export default function PurchaseTabs() {
  const pathname = usePathname();
  const onSuppliers = pathname.startsWith("/purchases/suppliers");
  const onReturns = pathname.startsWith("/purchases/returns");
  const onPurchases = !onSuppliers && !onReturns;

  return (
    <div className="flex gap-4 border-b border-gray-200" role="tablist" aria-label="Purchases sections">
      {TABS.map((tab) => {
        const isActive =
          tab.href === "/purchases/suppliers"
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
