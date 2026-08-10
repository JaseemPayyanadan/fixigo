"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { MdArrowBack, MdRefresh, MdWarning } from "react-icons/md";

import CollectPaymentDialog from "@/components/service/CollectPaymentDialog";
import ReopenServiceDialog from "@/components/service/ReopenServiceDialog";
import ServiceDetailsView from "@/components/service/ServiceDetailsView";
import ServiceForm from "@/components/service/ServiceForm";
import { useUser } from "@/hooks";
import { toastHref } from "@/hooks/useCrossNavToast";
import { authUserToUser } from "@/lib/auth";
import {
  paymentLabelOf,
  shouldOpenCollectPaymentModal,
  type ServicePaymentStatus,
} from "@/lib/paymentUtils";
import { setServicePayment } from "@/lib/servicePayments";
import type { CollectPaymentSaveInput } from "@/components/service/CollectPaymentDialog";
import { buildReopenFields, canReopenService } from "@/lib/serviceReopen";
import { appendStatusHistory, buildStatusHistoryEntry, mapStatusHistoryEntries } from "@/lib/serviceStatusHistory";
import { normalizeStatus } from "@/lib/statusUtils";
import RequestSparePartModal from "@/modules/purchase/RequestSparePartModal";
import type { Branch, StatusHistoryEntry, Technician } from "@/types";
import type { PurchaseRequest } from "@/types/purchaseRequest";

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  shopId: string;
  branchId: string;
  technician_id?: string;
  priority: string;
  status: string;
  created_by?: { role: string; name: string };
  createdAt: Date;
  updatedAt: Date;
  actualDuration?: number;
  scheduledDate?: Date;
  completedDate?: Date;
  notes?: string;
  workNotes?: string[];
  partsUsed?: Array<{
    name: string;
    quantity: number;
    cost: number;
  }>;
  customerFeedback?: {
    rating: number;
    comment?: string;
    date: Date;
  };
  qualityScore?: number;
  estimatedCompletion?: Date;
  actualCompletion?: Date;
  paymentStatus?: ServicePaymentStatus;
  paidAmount?: number;
  paidAt?: Date;
  isReopened?: boolean;
  reopenReason?: string;
  reopenedAt?: Date;
  reopenCount?: number;
  statusHistory?: StatusHistoryEntry[];
  device?: {
    model: string;
    brand: string;
    imei: string;
    color?: string;
    type?: string;
    issue?: string;
  };
  customer?: {
    name: string;
    phone?: string;
    place?: string;
    email?: string;
    address?: string;
  };
}

const STATUS_OPTIONS = ["To Do", "In Progress", "Completed", "Pending", "Cancelled", "Awaiting Parts", "Ready for Pickup"];

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  return undefined;
}

function reviveService(raw: Record<string, unknown> & { id: string }): Service {
  return {
    ...(raw as unknown as Service),
    id: raw.id,
    createdAt: toDate(raw.createdAt) || new Date(),
    updatedAt: toDate(raw.updatedAt) || new Date(),
    scheduledDate: toDate(raw.scheduledDate),
    completedDate: toDate(raw.completedDate),
    estimatedCompletion: toDate(raw.estimatedCompletion),
    actualCompletion: toDate(raw.actualCompletion),
    paidAt: toDate(raw.paidAt),
    reopenedAt: toDate(raw.reopenedAt),
    statusHistory: mapStatusHistoryEntries(raw.statusHistory),
    customerFeedback: raw.customerFeedback
      ? {
          ...((raw.customerFeedback as object) || {}),
          rating: (raw.customerFeedback as { rating?: number }).rating || 0,
          comment: (raw.customerFeedback as { comment?: string }).comment,
          date: toDate((raw.customerFeedback as { date?: unknown }).date) || new Date(),
        }
      : undefined,
  };
}

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body.error || "Request failed";
  } catch {
    return `Request failed (${response.status})`;
  }
}

async function patchService(serviceId: string, body: unknown): Promise<Service> {
  const response = await fetch(`/api/services/${encodeURIComponent(serviceId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await readError(response));
  const payload = await response.json();
  return reviveService(payload.service);
}


function ServiceDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50" role="status">
      <span className="sr-only">Loading service details...</span>
      <div className="sticky top-0 z-50 border-b border-gray-100 bg-white shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-11 w-11 animate-pulse rounded-lg bg-gray-100 motion-reduce:animate-none" aria-hidden="true" />
          <div className="h-5 w-36 animate-pulse rounded-lg bg-gray-100 motion-reduce:animate-none" aria-hidden="true" />
        </div>
      </div>
      <div className="space-y-4 p-4">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-2xl bg-gray-100 motion-reduce:animate-none"
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}

function ServiceDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceId = searchParams.get("id");
  const { user } = useUser();
  const convertedUser = user ? authUserToUser(user) : null;
  const [service, setService] = useState<Service | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [branchId, setBranchId] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("To Do");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [statusUpdateSuccess, setStatusUpdateSuccess] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [showCollectPaymentDialog, setShowCollectPaymentDialog] = useState(false);
  const [collectPaymentContext, setCollectPaymentContext] = useState<"complete" | "update">("complete");
  const [collectPaymentError, setCollectPaymentError] = useState<string | null>(null);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [reopenError, setReopenError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showRequestSparePart, setShowRequestSparePart] = useState(false);

  useEffect(() => {
    if (!serviceId) return;

    const fetchService = async () => {
      try {
        const response = await fetch(`/api/services/${encodeURIComponent(serviceId)}`);
        if (!response.ok) throw new Error(await readError(response));
        const payload = await response.json();
        const serviceData = reviveService(payload.service);

        setService(serviceData);
        setStatusHistory(serviceData.statusHistory ?? []);
        setStatus(serviceData.status || "To Do");
        if (user?.role === "technician" && user?.branchId) {
          setBranchId(user.branchId);
        } else {
          setBranchId(serviceData.branchId);
        }
      } catch (err) {
        console.error("Error fetching service:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch service");
      } finally {
        setLoading(false);
      }
    };

    const fetchBranches = async () => {
      if (!user?.shopId) return;
      try {
        const response = await fetch("/api/branches");
        if (!response.ok) throw new Error(await readError(response));
        const payload = await response.json();
        setBranches(Array.isArray(payload.branches) ? payload.branches : []);
      } catch (err) {
        console.error("Error fetching branches:", err);
      }
    };

    const fetchTechnicians = async () => {
      if (!user?.shopId) return;
      try {
        const response = await fetch("/api/technicians");
        if (!response.ok) throw new Error("Failed to fetch technicians");
        const { technicians: techniciansData } = (await response.json()) as { technicians: Technician[] };

        setTechnicians(techniciansData);
      } catch (err) {
        console.error("Error fetching technicians:", err);
      }
    };

    fetchService();
    fetchBranches();
    fetchTechnicians();
  }, [serviceId, user?.shopId, user?.role, user?.branchId]);

  const handleEdit = async (data: { service: { name: string; description: string; price: string; branchId: string; technician_id?: string }; customer: { name: string; phone?: string; place?: string }; device: { brand: string; model: string; imei: string; color: string } }) => {
    setError(null);
    setEditLoading(true);

    try {
      // For technicians, always use their assigned branch
      const finalBranchId = user?.role === "technician" && user?.branchId ? user.branchId : data.service.branchId;
      
      const updated = await patchService(serviceId!, {
        fields: {
          name: data.service.name,
          description: data.service.description,
          price: Number(data.service.price),
          branchId: finalBranchId,
          technician_id: data.service.technician_id || (user?.role === "technician" ? user.id : ""),
          customer: data.customer,
          device: data.device,
          status,
        },
      });
      setService(updated);
      setEditing(false);
    } catch (err: unknown) {
      console.error("Error updating service:", err);
      setError(err instanceof Error ? err.message : "Failed to update service");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this service?")) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/services/${encodeURIComponent(serviceId!)}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(await readError(response));
      router.push("/services");
    } catch (err: unknown) {
      console.error("Error deleting service:", err);
      setError(err instanceof Error ? err.message : "Failed to delete service");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    setUpdatingStatus(true);

    if (serviceId) {
      try {
        const now = new Date();

        // Stamp the moment the job actually finished. Nothing else records it,
        // and the dashboard dates completed work — and therefore its revenue —
        // from this field; without it, finished jobs never land on a day.
        // Moving back out of `completed` clears it, so a mistaken completion
        // does not leave a false timestamp behind.
        const isCompleted = normalizeStatus(newStatus) === "completed";

        // Completing a job now records payment as explicitly outstanding when
        // nothing has been recorded yet. Services with no flag at all are read
        // as paid-if-completed — the right call for work settled before this
        // existed, but wrong for a job being completed right now, which would
        // otherwise book revenue nobody has collected.
        const recordsPaymentPending = isCompleted && !service?.paymentStatus;

        // Appended with `arrayUnion` rather than written as a whole array: the
        // local copy was loaded at mount, so replacing the array would drop any
        // transition another user recorded in the meantime.
        const historyEntry = buildStatusHistoryEntry({
          status: newStatus,
          timestamp: now,
          updatedBy: user?.name || "Unknown",
        });
        const nextHistory = appendStatusHistory(statusHistory, historyEntry);

        const fields: Record<string, unknown> = {
          status: newStatus,
          ...(isCompleted
            ? { completedDate: now, actualCompletion: now }
            : {}),
          ...(recordsPaymentPending ? { paymentStatus: "pending" } : {}),
        };
        const deleteFields = isCompleted ? [] : ["completedDate", "actualCompletion"];

        const updated = await patchService(serviceId, {
          fields,
          statusHistoryAppend: historyEntry,
          deleteFields,
        });
        setService(updated);
        setStatusHistory(updated.statusHistory ?? nextHistory);

        setStatusUpdateSuccess(true);
        setTimeout(() => setStatusUpdateSuccess(false), 3000); // Hide success message after 3 seconds

        // Status is already saved. Open Collect Payment only for Completed with
        // outstanding payment (paymentStatus before this write). Never for Ready
        // for Pickup — that is intentionally not a collect trigger here.
        if (shouldOpenCollectPaymentModal(newStatus, service?.paymentStatus)) {
          setCollectPaymentError(null);
          setCollectPaymentContext("complete");
          setShowCollectPaymentDialog(true);
        } else {
          setShowCollectPaymentDialog(false);
        }
      } catch (err) {
        console.error("Error updating status:", err);
        setStatus(service?.status || "To Do"); // Revert on error
        setError("Failed to update status. Please try again.");
      } finally {
        setUpdatingStatus(false);
      }
    }
  };

  const handleConfirmReopen = async (reason: string) => {
    if (!serviceId || !service) return;
    setReopening(true);
    setReopenError(null);
    try {
      const now = new Date();
      const fields = buildReopenFields(reason, service.reopenCount, now, service.paymentStatus);
      const historyEntry = buildStatusHistoryEntry({
        status: fields.status,
        timestamp: now,
        updatedBy: user?.name || "Unknown",
      });
      const nextHistory = appendStatusHistory(statusHistory, historyEntry);
      const updated = await patchService(serviceId, {
        fields: { ...fields },
        statusHistoryAppend: historyEntry,
        deleteFields: ["completedDate", "actualCompletion"],
      });
      setService(updated);
      setStatus(fields.status);
      setStatusHistory(updated.statusHistory ?? nextHistory);
      setShowReopenDialog(false);
      setStatusUpdateSuccess(true);
      setTimeout(() => setStatusUpdateSuccess(false), 3000);
    } catch (err) {
      console.error("Error reopening service:", err);
      setReopenError("Failed to reopen service. Please try again.");
    } finally {
      setReopening(false);
    }
  };

  const handlePaymentSave = async (input: CollectPaymentSaveInput) => {
    if (!serviceId) return;
    setUpdatingPayment(true);
    setCollectPaymentError(null);

    try {
      const write = await setServicePayment(serviceId, input);
      setService((prev) =>
        prev
          ? {
              ...prev,
              paymentStatus: write.paymentStatus,
              paidAmount: write.paidAmount,
              paidAt: write.paidAt,
              updatedAt: new Date(),
            }
          : null
      );
      setShowCollectPaymentDialog(false);
      setCollectPaymentError(null);
    } catch (err) {
      console.error("Error updating payment:", err);
      // Deliberately not the page-level `error`: that renders the full-screen
      // "Error Loading Service" view, which unmounts this dialog and throws the
      // user off the page over a failed write they can simply retry.
      setCollectPaymentError("Failed to update payment. Please try again.");
    } finally {
      setUpdatingPayment(false);
    }
  };

  const handleCollectClose = () => {
    if (updatingPayment) return;
    setShowCollectPaymentDialog(false);
    setCollectPaymentError(null);
  };

  const getAssignedTechnicianInfo = () => {
    if (!service) return { name: "Not assigned", id: null, technician: null };
    
    // Use only technician_id field
    const technicianId = service.technician_id;

    if (!technicianId) {
      return { name: "Not assigned", id: null, technician: null };
    }
    
    const technician = technicians.find(
      (t) => t.id === technicianId || t.userId === technicianId
    );

    return {
      name: technician?.name || `Unknown Technician (${technicianId})`,
      id: technicianId,
      technician: technician
    };
  };

  const handleSparePartRequested = useCallback(
    (request: PurchaseRequest) => {
      setShowRequestSparePart(false);
      router.push(toastHref("/purchases/requests", `Request ${request.ref} was submitted`));
    },
    [router]
  );

  // Memoized handlers to avoid arrow functions in JSX
  const handleGoBack = useCallback(() => router.back(), [router]);
  const handleReload = useCallback(() => window.location.reload(), []);
  const handleToggleShowHistory = useCallback(() => setShowHistory((prev) => !prev), []);
  const handleCancelEdit = useCallback(() => setEditing(false), []);
  const handleEditClick = useCallback(() => setEditing(true), []);
  const toggleDropdown = useCallback(() => {
    setShowDropdown(prev => !prev);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdown) {
        const target = event.target as Element;
        if (!target.closest('.dropdown-container')) {
          setShowDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  if (loading) {
    return <ServiceDetailsSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <MdWarning className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Service</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleGoBack}
              className="inline-flex min-h-11 items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors motion-reduce:transition-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Go Back
            </button>
            <button
              onClick={handleReload}
              className="inline-flex min-h-11 items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors motion-reduce:transition-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <MdRefresh className="w-4 h-4 inline mr-1" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!service) return null;

  if (editing) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-6">
            <button
              onClick={handleCancelEdit}
              className="mr-4 inline-flex min-h-11 min-w-11 items-center justify-center p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors motion-reduce:transition-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Cancel edit"
            >
              <MdArrowBack className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Edit Service</h1>
          </div>

          <ServiceForm
            key={editing ? "editing" : "viewing"}
            onSubmit={handleEdit}
            loading={editLoading}
            editing={true}
            error={error}
            branches={branches}
            technicians={technicians}
            branchId={branchId}
            setBranchId={setBranchId}
            user={convertedUser}
            shopId={user?.shopId}
            initialData={(() => {
              const initialData = {
                customer: {
                  name: service.customer?.name || "",
                  phone: service.customer?.phone || "",
                  place: service.customer?.place || "",
                },
                device: {
                  brand: typeof service.device?.brand === "string" ? service.device.brand : "",
                  model: typeof service.device?.model === "string" ? service.device.model : "",
                  imei: typeof service.device?.imei === "string" ? service.device.imei : "",
                  color: typeof (service.device as Record<string, unknown>)?.color === "string" ? ((service.device as Record<string, unknown>).color as string) : "",
                },
                service: {
                  name: service.name,
                  description: service.description,
                  price: String(service.price),
                  technician_id: service.technician_id || "",
                  branchId: service.branchId || "",
                },
              };

              return initialData;
            })()}
            onCancelEdit={handleCancelEdit}
          />
        </div>
      </div>
    );
  }

  const branchName = branches.find((b) => b.id === service.branchId)?.name || "—";
  const userCanReopen = canReopenService(
    user ? { role: user.role, id: user.id } : null,
    service ? { ...service, status } : null,
    technicians
  );
  const techInfo = getAssignedTechnicianInfo();
  // service.technician_id may store either the technician doc's own id or its
  // linked userId (see getAssignedTechnicianInfo above) — resolve through the
  // matched technician record rather than comparing the raw id directly, or a
  // technician assigned via the doc-id form never sees their own button.
  const canRequestSparePart =
    user?.role === "technician"
      ? service.technician_id === user.id || techInfo.technician?.userId === user.id
      : true;

  return (
    <>
      <ServiceDetailsView
        service={service}
        status={status}
        branchName={branchName}
        technician={techInfo.technician ?? null}
        technicianId={techInfo.id}
        technicianDisplayName={techInfo.name}
        userCanReopen={userCanReopen}
        updatingStatus={updatingStatus}
        statusUpdateSuccess={statusUpdateSuccess}
        paymentLabel={paymentLabelOf({
          status: service.status,
          paymentStatus: service.paymentStatus,
          paidAmount: service.paidAmount,
          price: service.price,
        })}
        paymentError={showCollectPaymentDialog ? null : collectPaymentError}
        showDropdown={showDropdown}
        showHistory={showHistory}
        statusHistory={statusHistory}
        statusOptions={STATUS_OPTIONS}
        canRequestSparePart={canRequestSparePart}
        onGoBack={handleGoBack}
        onEdit={handleEditClick}
        onDelete={handleDelete}
        onToggleDropdown={toggleDropdown}
        onToggleHistory={handleToggleShowHistory}
        onStatusChange={handleStatusChange}
        onUpdatePayment={() => {
          setCollectPaymentError(null);
          setCollectPaymentContext("update");
          setShowCollectPaymentDialog(true);
        }}
        onReopenClick={() => {
          setReopenError(null);
          setShowReopenDialog(true);
        }}
        onRequestSparePart={() => setShowRequestSparePart(true)}
      />
      <RequestSparePartModal
        open={showRequestSparePart}
        serviceId={service.id}
        deviceBrand={service.device?.brand}
        deviceModel={service.device?.model}
        onClose={() => setShowRequestSparePart(false)}
        onCreated={handleSparePartRequested}
      />
      <ReopenServiceDialog
        isOpen={showReopenDialog}
        submitting={reopening}
        error={reopenError}
        onClose={() => {
          if (!reopening) setShowReopenDialog(false);
        }}
        onConfirm={handleConfirmReopen}
      />
      <CollectPaymentDialog
        isOpen={showCollectPaymentDialog}
        amount={service.price ?? 0}
        initialStatus={
          service.paymentStatus === "pending" ||
          service.paymentStatus === "partial" ||
          service.paymentStatus === "paid"
            ? service.paymentStatus
            : "paid"
        }
        initialPaidAmount={service.paidAmount}
        context={collectPaymentContext}
        submitting={updatingPayment}
        error={collectPaymentError}
        onClose={handleCollectClose}
        onSave={(input) => {
          void handlePaymentSave(input);
        }}
      />
    </>
  );
}

export default function ServiceDetailsPageWrapper() {
  return (
    <Suspense fallback={<ServiceDetailsSkeleton />}>
      <ServiceDetailsPage />
    </Suspense>
  );
}
