// src/modules/purchase/RequestSparePartModal.tsx
"use client";

import React from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/Button";
import type { PurchaseRequest } from "@/types/purchaseRequest";

import RequestSparePartForm, { type RequestSparePartItem } from "./RequestSparePartForm";

const REQUEST_MODAL_FORM_ID = "request-spare-part-modal-form";

interface Props {
  open: boolean;
  serviceId: string;
  onClose: () => void;
  onCreated: (request: PurchaseRequest) => void;
}

/** Mirrors AddSupplierModal.tsx: portal, bottom sheet on mobile, centered on desktop. */
const RequestSparePartModal = React.memo(function RequestSparePartModal({
  open,
  serviceId,
  onClose,
  onCreated,
}: Props) {
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const handleSubmit = React.useCallback(
    async (items: RequestSparePartItem[]) => {
      if (items.length === 0) {
        setError("Add at least one item");
        return;
      }

      setSaving(true);
      setError(null);
      try {
        const response = await fetch("/api/purchase-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceId, items }),
        });
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Could not submit the request");
        }
        const body = (await response.json()) as { purchaseRequest: PurchaseRequest };
        onCreated(body.purchaseRequest);
      } catch (caught) {
        setError((caught as Error).message);
      } finally {
        setSaving(false);
      }
    },
    [serviceId, onCreated]
  );

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10050] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <h2 className="text-base font-semibold text-gray-900">Request spare part</h2>
        <p className="mt-1 text-sm text-gray-500">
          The repair id and customer name are attached automatically.
        </p>

        <div className="mt-4">
          <RequestSparePartForm
            formId={REQUEST_MODAL_FORM_ID}
            saving={saving}
            error={error}
            onSubmit={handleSubmit}
          />
        </div>

        <div className="mt-4 flex gap-2">
          <Button type="button" variant="secondary" size="lg" fullWidth onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={REQUEST_MODAL_FORM_ID} size="lg" fullWidth disabled={saving}>
            {saving ? "Submitting…" : "Submit request"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
});

export default RequestSparePartModal;
