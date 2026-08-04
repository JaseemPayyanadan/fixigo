"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { collection, deleteDoc, deleteField, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { MdArrowBack, MdRefresh, MdWarning } from "react-icons/md";

import CollectPaymentDialog from "@/components/service/CollectPaymentDialog";
import ReopenServiceDialog from "@/components/service/ReopenServiceDialog";
import ServiceDetailsView from "@/components/service/ServiceDetailsView";
import ServiceForm from "@/components/service/ServiceForm";
import { useUser } from "@/hooks";
import { authUserToUser } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { isPaid, shouldOpenCollectPaymentModal, type ServicePaymentStatus } from "@/lib/paymentUtils";
import { setServicePayment } from "@/lib/servicePayments";
import { buildReopenFields, canReopenService } from "@/lib/serviceReopen";
import { appendStatusHistory, mapStatusHistoryEntries } from "@/lib/serviceStatusHistory";
import { normalizeStatus } from "@/lib/statusUtils";
import type { Branch, StatusHistoryEntry, Technician } from "@/types";

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
  const [collectPaymentError, setCollectPaymentError] = useState<string | null>(null);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [reopenError, setReopenError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!serviceId) return;

    const fetchService = async () => {
      try {
        const serviceDoc = await getDoc(doc(db, "services", serviceId));
        if (serviceDoc.exists()) {
          const data = serviceDoc.data();

          const serviceData: Service = {
            id: serviceDoc.id,
            name: data.name,
            description: data.description,
            price: data.price,
            shopId: data.shopId,
            branchId: data.branchId,
            status: data.status || "pending",
            priority: data.priority || "medium",
            customer: data.customer || { name: "", phone: "", email: "" },
            device: data.device || { brand: "", model: "", imei: "", color: "", type: "" },
            technician_id: data.technician_id || "",
            actualDuration: data.actualDuration,
            scheduledDate: data.scheduledDate?.toDate(),
            completedDate: data.completedDate?.toDate(),
            notes: data.notes,
            workNotes: data.workNotes,
            partsUsed: data.partsUsed,
            customerFeedback: data.customerFeedback
              ? {
                  rating: data.customerFeedback.rating,
                  comment: data.customerFeedback.comment,
                  date: data.customerFeedback.date?.toDate() || new Date(),
                }
              : undefined,
            qualityScore: data.qualityScore,
            estimatedCompletion: data.estimatedCompletion?.toDate(),
            actualCompletion: data.actualCompletion?.toDate(),
            // Left absent when the document predates payment tracking, so
            // `isPaid` can fall back to the work status.
            paymentStatus: data.paymentStatus === "paid" || data.paymentStatus === "pending" ? data.paymentStatus : undefined,
            paidAt: data.paidAt?.toDate(),
            isReopened: data.isReopened === true,
            reopenReason: typeof data.reopenReason === "string" ? data.reopenReason : undefined,
            reopenedAt: data.reopenedAt?.toDate?.(),
            reopenCount: typeof data.reopenCount === "number" ? data.reopenCount : undefined,
            statusHistory: mapStatusHistoryEntries(data.statusHistory),
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          };
          setService(serviceData);
          setStatusHistory(serviceData.statusHistory ?? []);
          setStatus(serviceData.status || "To Do");
          // For technicians, always use their assigned branch
          if (user?.role === "technician" && user?.branchId) {
            setBranchId(user.branchId);
          } else {
            setBranchId(serviceData.branchId);
          }
        } else {
          setError("Service not found");
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
        const branchesRef = collection(db, "branches");
        const q = query(branchesRef, where("shopId", "==", user.shopId));
        const querySnapshot = await getDocs(q);
        const branchesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Branch[];
        setBranches(branchesData);
      } catch (err) {
        console.error("Error fetching branches:", err);
        // Could set error state here if needed
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
        // Could set error state here if needed
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
      
      const updateData = {
        name: data.service.name,
        description: data.service.description,
        price: Number(data.service.price),
        branchId: finalBranchId,
        technician_id: data.service.technician_id || (user?.role === "technician" ? user.id : ""),
        customer: data.customer,
        device: data.device,
        status,
        updatedAt: new Date(),
      };

      await updateDoc(doc(db, "services", serviceId!), updateData);

      setService((prev) =>
        prev
          ? {
              ...prev,
              name: data.service.name,
              description: data.service.description,
              price: Number(data.service.price),
              customer: data.customer,
              device: data.device,
              branchId: finalBranchId,
              technician_id: data.service.technician_id || (user?.role === "technician" ? user.id : ""),
              status,
              updatedAt: new Date(),
            }
          : null
      );
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
      await deleteDoc(doc(db, "services", serviceId!));
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

        const nextHistory = appendStatusHistory(statusHistory, {
          status: newStatus,
          timestamp: now,
          updatedBy: user?.name || "Unknown",
        });

        await updateDoc(doc(db, "services", serviceId), {
          status: newStatus,
          updatedAt: now,
          statusHistory: nextHistory,
          ...(isCompleted
            ? { completedDate: now, actualCompletion: now }
            : { completedDate: deleteField(), actualCompletion: deleteField() }),
          ...(recordsPaymentPending ? { paymentStatus: "pending" } : {}),
        });

        // Mirror the same change locally. The panel above renders whenever
        // `completedDate` is set, so leaving stale state behind would keep
        // showing a completion date for a job that is no longer completed.
        setService((prev) =>
          prev
            ? {
                ...prev,
                status: newStatus,
                updatedAt: now,
                completedDate: isCompleted ? now : undefined,
                actualCompletion: isCompleted ? now : undefined,
                paymentStatus: recordsPaymentPending ? "pending" : prev.paymentStatus,
                statusHistory: nextHistory,
              }
            : null
        );

        setStatusHistory(nextHistory);
        setStatusUpdateSuccess(true);
        setTimeout(() => setStatusUpdateSuccess(false), 3000); // Hide success message after 3 seconds

        // Status is already saved. Open Collect Payment only for Completed with
        // outstanding payment (paymentStatus before this write). Never for Ready
        // for Pickup — that is intentionally not a collect trigger here.
        if (shouldOpenCollectPaymentModal(newStatus, service?.paymentStatus)) {
          setCollectPaymentError(null);
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
      const fields = buildReopenFields(reason, service.reopenCount, now);
      const nextHistory = appendStatusHistory(statusHistory, {
        status: "in_progress",
        timestamp: now,
        updatedBy: user?.name || "Unknown",
      });
      await updateDoc(doc(db, "services", serviceId), {
        ...fields,
        updatedAt: now,
        statusHistory: nextHistory,
        completedDate: deleteField(),
        actualCompletion: deleteField(),
      });
      setService((prev) =>
        prev
          ? {
              ...prev,
              ...fields,
              updatedAt: now,
              completedDate: undefined,
              actualCompletion: undefined,
              statusHistory: nextHistory,
            }
          : null
      );
      setStatus("in_progress");
      setStatusHistory(nextHistory);
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

  const handlePaymentChange = async (paid: boolean) => {
    if (!serviceId) return;
    setUpdatingPayment(true);

    try {
      const write = await setServicePayment(serviceId, paid);
      setService((prev) => (prev ? { ...prev, ...write, paidAt: write.paidAt, updatedAt: new Date() } : null));
      setShowCollectPaymentDialog(false);
      setCollectPaymentError(null);
    } catch (err) {
      console.error("Error updating payment:", err);
      setError("Failed to update payment. Please try again.");
      setCollectPaymentError("Failed to update payment. Please try again.");
    } finally {
      setUpdatingPayment(false);
    }
  };

  const handleCollectMarkPaid = () => {
    void handlePaymentChange(true);
  };

  const handleCollectKeepUnpaid = () => {
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
              className="inline-flex min-h-11 items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors motion-reduce:transition-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Go Back
            </button>
            <button
              onClick={handleReload}
              className="inline-flex min-h-11 items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors motion-reduce:transition-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="mr-4 inline-flex min-h-11 min-w-11 items-center justify-center p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors motion-reduce:transition-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
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
  const servicePaid = isPaid({ ...service, status });
  const userCanReopen = canReopenService(
    user ? { role: user.role, id: user.id } : null,
    service
  );
  const techInfo = getAssignedTechnicianInfo();

  return (
    <>
      <ServiceDetailsView
        service={service}
        status={status}
        branchName={branchName}
        technician={techInfo.technician ?? null}
        technicianId={techInfo.id}
        technicianDisplayName={techInfo.name}
        servicePaid={servicePaid}
        userCanReopen={userCanReopen}
        updatingStatus={updatingStatus}
        statusUpdateSuccess={statusUpdateSuccess}
        updatingPayment={updatingPayment}
        showDropdown={showDropdown}
        showHistory={showHistory}
        statusHistory={statusHistory}
        statusOptions={STATUS_OPTIONS}
        onGoBack={handleGoBack}
        onEdit={handleEditClick}
        onDelete={handleDelete}
        onToggleDropdown={toggleDropdown}
        onToggleHistory={handleToggleShowHistory}
        onStatusChange={handleStatusChange}
        onPaymentToggle={() => handlePaymentChange(!servicePaid)}
        onReopenClick={() => {
          setReopenError(null);
          setShowReopenDialog(true);
        }}
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
        submitting={updatingPayment}
        error={collectPaymentError}
        onClose={handleCollectKeepUnpaid}
        onMarkPaid={handleCollectMarkPaid}
        onKeepUnpaid={handleCollectKeepUnpaid}
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
