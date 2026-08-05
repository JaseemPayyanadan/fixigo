"use client";

import React from "react";

import { formatRupees } from "@/lib/purchaseFormat";
import type { Purchase } from "@/types/purchase";

interface Props {
  serviceId: string;
}

/**
 * Read-only. Purchase entry lives in the purchases module — this section only
 * answers "did the part for this job arrive?".
 */
const ServicePartsOrdered = React.memo(function ServicePartsOrdered({ serviceId }: Props) {
  const [purchases, setPurchases] = React.useState<Purchase[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(`/api/purchases?serviceId=${encodeURIComponent(serviceId)}`, {
          signal: controller.signal,
        });
        if (response.ok) {
          const body = (await response.json()) as { purchases: Purchase[] };
          setPurchases(body.purchases);
        }
        // A 403 is expected for technicians; the section simply stays empty.
      } catch {
        // Swallowed on purpose: this panel is supplementary to the job screen.
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [serviceId]);

  if (loading || purchases.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Parts ordered</h3>
      <ul className="space-y-2">
        {purchases.flatMap((purchase) =>
          purchase.items
            .filter((item) => item.serviceId === serviceId)
            .map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between border-b border-gray-100 pb-2 text-sm last:border-0"
              >
                <div>
                  <p className="text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">
                    {purchase.ref} · {purchase.supplierName} · qty {item.quantity}
                  </p>
                </div>
                <span className="font-medium text-gray-900">{formatRupees(item.lineTotal)}</span>
              </li>
            ))
        )}
      </ul>
    </div>
  );
});

export default ServicePartsOrdered;
