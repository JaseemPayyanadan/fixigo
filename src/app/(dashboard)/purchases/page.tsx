// src/app/(dashboard)/purchases/page.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useRef, useState } from "react";

import { CheckIcon, FunnelIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/Button";
import { ListPageSkeleton, PageFallback, TableSkeleton } from "@/components/ui/PageSkeleton";
import SlideOver from "@/components/ui/SlideOver";
import Toast from "@/components/ui/Toast";
import PurchaseFormHost from "@/modules/purchase/PurchaseFormHost";
import PurchaseList from "@/modules/purchase/PurchaseList";
import PurchaseSummaryCards from "@/modules/purchase/PurchaseSummaryCards";
import type { PurchaseSummary } from "@/lib/purchaseSummary";
import type { Purchase } from "@/types/purchase";

type StatusFilter = "all" | "unpaid" | "partial" | "paid";

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: "unpaid", label: "Pending" },
  { key: "partial", label: "Partially paid" },
  { key: "paid", label: "Paid" },
];

const DESKTOP_MQ = "(min-width: 768px)";

function isDesktopViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia(DESKTOP_MQ).matches;
}

function revivePurchases(purchases: Purchase[]): Purchase[] {
  return purchases.map((purchase) => ({
    ...purchase,
    purchaseDate: new Date(purchase.purchaseDate),
    dueDate: purchase.dueDate ? new Date(purchase.dueDate) : undefined,
  }));
}

function PaymentStatusFilterDropdown({
  chips,
  statusFilter,
  totalCount,
  onSelect,
}: {
  chips: Array<{ key: StatusFilter; label: string; count: number }>;
  statusFilter: StatusFilter;
  totalCount: number;
  onSelect: (key: StatusFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isFiltered = statusFilter !== "all";
  const activeLabel = chips.find((chip) => chip.key === statusFilter)?.label;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const choose = (key: StatusFilter) => {
    onSelect(key);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Filter by payment status: ${activeLabel ?? "All statuses"}`}
        className={`relative flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${
          isFiltered
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : "border-gray-200 bg-white text-gray-600"
        }`}
      >
        <FunnelIcon className="h-5 w-5" />
        {isFiltered && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-blue-600" aria-hidden="true" />
        )}
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg"
        >
          <button
            type="button"
            role="option"
            aria-selected={!isFiltered}
            onClick={() => choose("all")}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
          >
            <CheckIcon className={`h-4 w-4 shrink-0 ${isFiltered ? "invisible" : "text-blue-600"}`} />
            <span>All statuses</span>
            <span className="ml-auto text-xs font-semibold text-gray-500">{totalCount}</span>
          </button>

          {chips.map((chip) => {
            const selected = chip.key === statusFilter;
            return (
              <button
                key={chip.key}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => choose(chip.key)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                <CheckIcon className={`h-4 w-4 shrink-0 ${selected ? "text-blue-600" : "invisible"}`} />
                <span className="truncate">{chip.label}</span>
                <span className="ml-auto text-xs font-semibold text-gray-500">{chip.count}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PurchasesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toastParam = searchParams.get("toast");
  const newParam = searchParams.get("new");
  const editId = searchParams.get("edit");
  const slideMode = newParam === "1" || Boolean(editId);

  const [purchases, setPurchases] = React.useState<Purchase[]>([]);
  const [summary, setSummary] = React.useState<PurchaseSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  // unknown until matchMedia runs — avoid bouncing desktop users to /purchases/new
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [viewport, setViewport] = React.useState<"unknown" | "mobile" | "desktop">("unknown");

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [slideFormState, setSlideFormState] = React.useState({
    canSubmit: false,
    submitting: false,
    submitLabel: "Save purchase",
  });

  const purchaseSlideFormId = "purchase-slide-form";

  const loadPurchases = React.useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/purchases", { signal });
    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      throw new Error(body.error ?? "Could not load purchases");
    }
    const body = (await response.json()) as {
      purchases: Purchase[];
      summary: PurchaseSummary;
    };
    setPurchases(revivePurchases(body.purchases));
    setSummary(body.summary);
  }, []);

  React.useEffect(() => {
    const media = window.matchMedia(DESKTOP_MQ);
    const sync = () => setViewport(media.matches ? "desktop" : "mobile");
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  // Mobile keeps the full-page form; bounce query-param opens over to /purchases/new.
  React.useEffect(() => {
    if (!slideMode || viewport !== "mobile") return;
    if (editId) {
      router.replace(`/purchases/new?edit=${editId}`);
      return;
    }
    router.replace("/purchases/new");
  }, [slideMode, viewport, editId, router]);

  React.useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        await loadPurchases(controller.signal);
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
  }, [loadPurchases]);

  const closeSlide = React.useCallback(() => {
    router.replace("/purchases");
  }, [router]);

  const openNewPurchase = React.useCallback(() => {
    if (isDesktopViewport()) {
      router.push("/purchases?new=1");
      return;
    }
    router.push("/purchases/new");
  }, [router]);

  const visible = React.useMemo(() => {
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

      return true;
    });
  }, [purchases, search, statusFilter]);

  const statusFilterChips = React.useMemo(
    () =>
      STATUS_FILTERS.map((filter) => ({
        ...filter,
        count: purchases.filter((purchase) => purchase.paymentStatus === filter.key).length,
      })),
    [purchases]
  );

  const handleOpen = React.useCallback(
    (id: string) => router.push(`/purchases/details?id=${id}`),
    [router]
  );

  const handleSlideSuccess = React.useCallback(async () => {
    closeSlide();
    try {
      await loadPurchases();
    } catch (caught) {
      setError((caught as Error).message);
    }
  }, [closeSlide, loadPurchases]);

  React.useEffect(() => {
    if (!toastParam) return;
    setToastMessage(toastParam);
    router.replace("/purchases");
  }, [toastParam, router]);

  const showSlide = slideMode && viewport === "desktop";

  return (
    <div className="space-y-5 p-4 md:p-6">
      <PurchaseSummaryCards summary={summary} loading={loading} />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search reference, supplier, item…"
          className="h-11 flex-1 rounded-xl border border-gray-200 px-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2 lg:ml-auto">
          <PaymentStatusFilterDropdown
            chips={statusFilterChips}
            statusFilter={statusFilter}
            totalCount={purchases.length}
            onSelect={setStatusFilter}
          />
          <Button variant="secondary" onClick={() => router.push("/purchases/suppliers")}>
            Suppliers
          </Button>
          <Button onClick={openNewPurchase}>+ New Purchase</Button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={8} />
      ) : (
        <PurchaseList purchases={visible} onOpen={handleOpen} />
      )}

      <SlideOver
        open={showSlide}
        title={editId ? "Edit Purchase" : "New Purchase"}
        description="Record a spare purchase and its payment"
        onClose={closeSlide}
        maxWidthClassName="max-w-2xl"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={closeSlide}
              disabled={slideFormState.submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form={purchaseSlideFormId}
              disabled={!slideFormState.canSubmit || slideFormState.submitting}
            >
              {slideFormState.submitting ? "Saving…" : slideFormState.submitLabel}
            </Button>
          </div>
        }
      >
        <PurchaseFormHost
          editId={editId}
          formId={purchaseSlideFormId}
          hideSubmit
          onActionStateChange={setSlideFormState}
          onSuccess={handleSlideSuccess}
          onAddSupplier={() => router.push("/purchases/suppliers?new=1")}
        />
      </SlideOver>

      <Toast
        open={Boolean(toastMessage)}
        message={toastMessage ?? ""}
        variant="success"
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
}

export default function PurchasesPage() {
  return (
    <Suspense fallback={<ListPageSkeleton cards={4} rows={8} label="Loading purchases" />}>
      <PurchasesPageContent />
    </Suspense>
  );
}
