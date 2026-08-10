"use client";

import React from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/Button";
import type { Branch } from "@/types";
import type { Supplier } from "@/types/purchase";

import SupplierForm, { type SupplierPayload } from "./SupplierForm";

const SUPPLIER_MODAL_FORM_ID = "add-supplier-modal-form";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (supplier: Supplier) => void;
  /** Suppliers are branch-owned, so shop_admin picks one here regardless of what's elsewhere on the page. */
  branches?: Branch[];
  showBranchSelector?: boolean;
  /** branch_admin's fixed branch; empty for shop_admin, who must choose. */
  defaultBranchId?: string;
  /** Existing suppliers, for name-autocomplete when adding the same vendor for another branch. */
  suggestions?: Supplier[];
}

/**
 * Lets a purchase form add a supplier without navigating away and losing
 * in-progress purchase data. Portalled for the same reason as
 * PurchaseItemModal: a nested <form> would collapse into the outer one.
 */
const AddSupplierModal = React.memo(function AddSupplierModal({
  open,
  onClose,
  onCreated,
  branches,
  showBranchSelector,
  defaultBranchId = "",
  suggestions,
}: Props) {
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [branchId, setBranchId] = React.useState(defaultBranchId);

  React.useEffect(() => {
    if (open) {
      setError(null);
      setBranchId(defaultBranchId);
    }
  }, [open, defaultBranchId]);

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
        const body = (await response.json()) as { supplier: Supplier };
        onCreated(body.supplier);
      } catch (caught) {
        setError((caught as Error).message);
      } finally {
        setSaving(false);
      }
    },
    [onCreated]
  );

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10050] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <h2 className="text-base font-semibold text-gray-900">Add supplier</h2>

        <div className="mt-4">
          <SupplierForm
            initial={null}
            saving={saving}
            error={error}
            onSubmit={handleSubmit}
            onCancel={onClose}
            formId={SUPPLIER_MODAL_FORM_ID}
            hideSubmit
            branches={branches}
            showBranchSelector={showBranchSelector}
            branchId={branchId}
            setBranchId={setBranchId}
            suggestions={suggestions}
          />
        </div>

        <div className="mt-4 flex gap-2">
          <Button type="button" variant="secondary" size="lg" fullWidth onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={SUPPLIER_MODAL_FORM_ID} size="lg" fullWidth disabled={saving}>
            {saving ? "Saving…" : "Save supplier"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
});

export default AddSupplierModal;
