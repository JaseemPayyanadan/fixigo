// src/app/(dashboard)/purchases/page.tsx
"use client";

import { useRouter } from "next/navigation";
import React from "react";

import PurchaseList from "@/modules/purchase/PurchaseList";
import PurchaseSummaryCards from "@/modules/purchase/PurchaseSummaryCards";
import type { PurchaseSummary } from "@/lib/purchaseSummary";
import type { Purchase } from "@/types/purchase";

type DateFilter = "all" | "today" | "week" | "month";
type StatusFilter = "all" | "unpaid" | "partial" | "paid";

export default function PurchasesPage() {
  const router = useRouter();
  const [purchases, setPurchases] = React.useState<Purchase[]>([]);
  const [summary, setSummary] = React.useState<PurchaseSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState("");
  const [dateFilter, setDateFilter] = React.useState<DateFilter>("all");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");

  React.useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch("/api/purchases", { signal: controller.signal });
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Could not load purchases");
        }
        const body = (await response.json()) as {
          purchases: Purchase[];
          summary: PurchaseSummary;
        };
        // Dates arrive as JSON strings; revive them for the formatters.
        setPurchases(
          body.purchases.map((purchase) => ({
            ...purchase,
            purchaseDate: new Date(purchase.purchaseDate),
            dueDate: purchase.dueDate ? new Date(purchase.dueDate) : undefined,
          }))
        );
        setSummary(body.summary);
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") {
          setError((caught as Error).message);
        }
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, []);

  const visible = React.useMemo(() => {
    const now = new Date();
    const term = search.trim().toLowerCase();

    return purchases.filter((purchase) => {
      if (term) {
        const haystack = [
          purchase.ref,
          purchase.supplierInvoiceNo ?? "",
          purchase.supplierName,
          ...purchase.items.map((item) => item.name),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      if (statusFilter !== "all" && purchase.paymentStatus !== statusFilter) return false;

      if (dateFilter !== "all") {
        const days = dateFilter === "today" ? 1 : dateFilter === "week" ? 7 : 31;
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        if (purchase.purchaseDate < cutoff) return false;
      }

      return true;
    });
  }, [purchases, search, statusFilter, dateFilter]);

  const handleOpen = React.useCallback(
    (id: string) => router.push(`/purchases/details?id=${id}`),
    [router]
  );

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Spare Purchases</h1>
          <p className="text-sm text-gray-500">Manage spare purchases, suppliers and payments</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/purchases/suppliers")}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Suppliers
          </button>
          <button
            onClick={() => router.push("/purchases/new")}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + New Purchase
          </button>
        </div>
      </div>

      <PurchaseSummaryCards summary={summary} loading={loading} />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search reference, supplier, item…"
          className="h-11 flex-1 rounded-xl border border-gray-200 px-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value as DateFilter)}
          className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm"
        >
          <option value="all">All dates</option>
          <option value="today">Today</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="unpaid">Pending</option>
          <option value="partial">Partially paid</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          Loading purchases…
        </div>
      ) : (
        <PurchaseList purchases={visible} onOpen={handleOpen} />
      )}
    </div>
  );
}
