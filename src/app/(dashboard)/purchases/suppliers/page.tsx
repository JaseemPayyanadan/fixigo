"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

import { Button } from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { PageFallback, TableSkeleton } from "@/components/ui/PageSkeleton";
import SlideOver from "@/components/ui/SlideOver";
import Toast from "@/components/ui/Toast";
import { useBranches, useUser } from "@/hooks";
import { useCrossNavToast } from "@/hooks/useCrossNavToast";
import PurchaseTabs from "@/modules/purchase/PurchaseTabs";
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

  const { user } = useUser();
  const isShopAdmin = user?.role === "shop_admin";
  const { branches } = useBranches(user?.shopId);
  const [branchId, setBranchId] = React.useState("");

  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [creating, setCreating] = React.useState(openNew);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [toastMessage, setToastMessage] = useCrossNavToast("/purchases/suppliers");
  const [viewport, setViewport] = React.useState<"unknown" | "mobile" | "desktop">("unknown");
  const [deleteTarget, setDeleteTarget] = React.useState<Supplier | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

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
    if (!isShopAdmin && user?.branchId) {
      setBranchId(user.branchId);
    }
  }, [isShopAdmin, user?.branchId]);

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

  const handleDeleteConfirm = React.useCallback(async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/suppliers/${deleteTarget.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Could not delete the supplier");
      }
      setToastMessage(`"${deleteTarget.name}" was deleted`);
      setDeleteTarget(null);
      await load();
    } catch (caught) {
      setDeleteError((caught as Error).message);
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, load, setToastMessage]);

  const showSlide = creating && viewport === "desktop";
  const showInline = creating && viewport === "mobile";

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <PurchaseTabs />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Suppliers</h1>
        <Button onClick={openCreate}>+ Add Supplier</Button>
      </div>

      {showInline && (
        <SupplierForm
          initial={null}
          saving={saving}
          error={error}
          onSubmit={handleSubmit}
          onCancel={handleCancelCreate}
          branches={branches}
          showBranchSelector={isShopAdmin}
          branchId={branchId}
          setBranchId={setBranchId}
          suggestions={suppliers}
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
          branches={branches}
          showBranchColumn={isShopAdmin}
          onOpen={(id) => router.push(`/purchases/suppliers/details?id=${id}`)}
          onDelete={(supplier) => {
            setDeleteError(null);
            setDeleteTarget(supplier);
          }}
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
          branches={branches}
          showBranchSelector={isShopAdmin}
          branchId={branchId}
          setBranchId={setBranchId}
          suggestions={suppliers}
        />
      </SlideOver>

      <Toast
        open={Boolean(toastMessage)}
        message={toastMessage ?? ""}
        variant="success"
        onClose={() => setToastMessage(null)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete supplier?"
        description={
          deleteTarget
            ? `Permanently delete "${deleteTarget.name}"? This cannot be undone. All of their purchases will be cancelled.${
                deleteTarget.outstanding > 0
                  ? ` The outstanding balance of ₹${deleteTarget.outstanding.toLocaleString("en-IN")} will be cleared.`
                  : ""
              }`
            : ""
        }
        confirmLabel="Delete supplier"
        confirming={deleting}
        error={deleteError}
        onConfirm={handleDeleteConfirm}
        onClose={() => {
          if (!deleting) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
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
