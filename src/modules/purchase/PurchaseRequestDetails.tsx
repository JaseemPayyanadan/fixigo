// src/modules/purchase/PurchaseRequestDetails.tsx
"use client";

import React from "react";

import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import type { PurchaseRequest, PurchaseRequestStatus } from "@/types/purchaseRequest";

const STATUS_LABEL: Record<PurchaseRequestStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-600" },
};

interface Props {
  request: PurchaseRequest;
  canDecide: boolean;
  canCancel: boolean;
  onApprove: () => void;
  onOpenReject: () => void;
  onOpenCancel: () => void;
}

export default function PurchaseRequestDetails({
  request,
  canDecide,
  canCancel,
  onApprove,
  onOpenReject,
  onOpenCancel,
}: Props) {
  const status = STATUS_LABEL[request.status];
  const cardClass = "rounded-2xl border border-gray-100 bg-white p-5 shadow-sm";

  return (
    <div className="space-y-4">
      <section className={cardClass}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{request.ref}</h2>
            <p className="mt-1 text-sm text-gray-600">
              For{" "}
              <Link href={`/services/details?id=${request.serviceId}`} className="text-blue-600 hover:underline">
                Repair #{request.serviceId.slice(-8)}
              </Link>{" "}
              · {request.customerName}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}>
            {status.label}
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium text-gray-500">Requested by</dt>
            <dd className="text-gray-900">{request.requestedBy.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Requested on</dt>
            <dd className="text-gray-900">{formatDate(request.requestedAt)}</dd>
          </div>
          {request.decidedBy && (
            <div>
              <dt className="text-xs font-medium text-gray-500">Decided by</dt>
              <dd className="text-gray-900">{request.decidedBy.name}</dd>
            </div>
          )}
        </dl>

        {request.status === "rejected" && request.rejectReason && (
          <p className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            Reason: {request.rejectReason}
          </p>
        )}

        {(canDecide || canCancel) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {canDecide && (
              <>
                <Button type="button" onClick={onApprove}>
                  Approve
                </Button>
                <Button type="button" variant="secondary" onClick={onOpenReject}>
                  Reject
                </Button>
              </>
            )}
            {canCancel && (
              <Button type="button" variant="danger" onClick={onOpenCancel}>
                Cancel request
              </Button>
            )}
          </div>
        )}
      </section>

      <section className={cardClass}>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Items</h3>
        <ul className="space-y-2">
          {request.items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between border-b border-gray-100 pb-2 text-sm last:border-0"
            >
              <div>
                <p className="text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-500">
                  {[item.brand, item.model].filter(Boolean).join(" · ") || "—"}
                  {item.remarks ? ` · ${item.remarks}` : ""}
                </p>
              </div>
              <span className="font-medium text-gray-900">qty {item.quantity}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
