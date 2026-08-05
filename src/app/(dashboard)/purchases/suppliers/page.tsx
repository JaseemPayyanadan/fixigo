"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

import { Button } from "@/components/ui/Button";
import { PageFallback, TableSkeleton } from "@/components/ui/PageSkeleton";
import SlideOver from "@/components/ui/SlideOver";
import Toast from "@/components/ui/Toast";
import SupplierForm, { type SupplierPayload } from "@/modules/purchase/SupplierForm";
import SupplierList from "@/modules/purchase/SupplierList";
import type { Supplier } from "@/types/purchase";

const SUPPLIER_FORM_ID = "supplier-create-form";
const DESKTOP_MQ = "(min-width: 768px)";

function SuppliersContent() {
  const router = useRouter();
  // The Add Purchase form's "+ Add" button links here with ?new=1.
  const searchParams = useSearchParams();
  const openNew = searchParams.get("new") === "1";
  const toastParam = searchParams.get("toast");

  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [creating, setCreating] = React.useState(openNew);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [viewport, setViewport] = React.useState<"unknown" | "mobile" | "desktop">("unknown");

  const load = React.useCallback(async () => {
    try {
      const response = await fetch("/api/suppliers");
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Could not load suppliers");
      }
      const body = (await response.json()) as { suppliers: Supplier[] };
      setSuppliers(
        body.suppliers.map((supplier) => ({
          ...supplier,
          lastPurchaseAt: supplier.lastPurchaseAt ? new Date(supplier.lastPurchaseAt) : undefined,
        }))
      );
      setLoadError(null);
    } catch (caught) {
      setLoadError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (!toastParam) return;
    setToastMessage(toastParam);
    router.replace("/purchases/suppliers");
  }, [toastParam, router]);

  React.useEffect(() => {
    const media = window.matchMedia(DESKTOP_MQ);
    const sync = () => setViewport(media.matches ? "desktop" : "mobile");
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const handleCancelCreate = React.useCallback(() => {
    setCreating(false);
    setError(null);
    if (openNew) router.replace("/purchases/suppliers");
  }, [openNew, router]);

  const handleSubmit = React.useCallback(
    async (payload: SupplierPayload) => {
      setSaving(true);
      setError(null);
      try {
        const response = await fetch("/api/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Could not save the supplier");
        }
        setCreating(false);
        if (openNew) router.replace("/purchases/suppliers");
        await load();
      } catch (caught) {
        setError((caught as Error).message);
      } finally {
        setSaving(false);
      }
    },
    [load, openNew, router]
  );

  const openCreate = React.useCallback(() => {
    setError(null);
    setCreating(true);
  }, []);

  const showSlide = creating && viewport === "desktop";
  const showInline = creating && viewport === "mobile";

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Suppliers</h1>
          <nav className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-500" aria-label="Breadcrumb">
            <Link
              href="/purchases"
              className="hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Purchases
            </Link>
            <span aria-hidden="true">•</span>
            <span className="text-gray-700">Suppliers</span>
          </nav>
        </div>
        <Button onClick={openCreate}>+ Add Supplier</Button>
      </div>

      {showInline && (
        <SupplierForm
          initial={null}
          saving={saving}
          error={error}
          onSubmit={handleSubmit}
          onCancel={handleCancelCreate}
        />
      )}

      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={6} />
      ) : !loadError ? (
        <SupplierList
          suppliers={suppliers}
          onOpen={(id) => router.push(`/purchases/suppliers/details?id=${id}`)}
        />
      ) : null}

      <SlideOver
        open={showSlide}
        title="Add Supplier"
        description="Add a supplier before recording purchases"
        onClose={handleCancelCreate}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancelCreate}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" form={SUPPLIER_FORM_ID} disabled={saving}>
              {saving ? "Saving…" : "Save supplier"}
            </Button>
          </div>
        }
      >
        <SupplierForm
          initial={null}
          saving={saving}
          error={error}
          onSubmit={handleSubmit}
          onCancel={handleCancelCreate}
          formId={SUPPLIER_FORM_ID}
          hideSubmit
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

export default function SuppliersPage() {
  return (
    <Suspense fallback={<PageFallback label="Loading suppliers" />}>
      <SuppliersContent />
    </Suspense>
  );
}
