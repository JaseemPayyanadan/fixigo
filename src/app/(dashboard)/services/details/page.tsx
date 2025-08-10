"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { MdArrowBack, MdBuild, MdCheckCircle, MdDelete, MdDevices, MdEdit, MdFeedback, MdHistory, MdInfo, MdInventory, MdNotes, MdPerson, MdPrint, MdPriorityHigh, MdReceipt, MdRefresh, MdSchedule, MdStar, MdWarning } from "react-icons/md";

import { useUser } from "@/hooks";
import { authUserToUser } from "@/lib/auth";
import { db } from "@/lib/firebase";
import ServiceForm from "@/modules/service/ServiceForm";
import type { Branch, Technician } from "@/types";

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  shopId: string;
  branchId: string;
  created_by?: { role: string; name: string };
  createdAt: Date;
  updatedAt: Date;
  paymentStatus?: string;
  status?: string;
  technician_id?: string;
  priority?: string;
  estimatedDuration?: number;
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

interface StatusHistory {
  status: string;
  timestamp: Date;
  updatedBy: string;
}

const STATUS_OPTIONS = ["To Do", "In Progress", "Completed", "Pending", "Cancelled", "Awaiting Parts", "On Hold", "Ready for Pickup"];

const statusColors: Record<string, string> = {
  "To Do": "bg-slate-50 text-slate-700 border-slate-200",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Cancelled: "bg-red-50 text-red-700 border-red-200",
  "Awaiting Parts": "bg-violet-50 text-violet-700 border-violet-200",
  "On Hold": "bg-orange-50 text-orange-700 border-orange-200",
  "Ready for Pickup": "bg-indigo-50 text-indigo-700 border-indigo-200",
};

const statusIcons: Record<string, React.ReactNode> = {
  "To Do": <MdSchedule className="w-4 h-4" />,
  Completed: <MdCheckCircle className="w-4 h-4" />,
  "In Progress": <MdBuild className="w-4 h-4" />,
  Pending: <MdSchedule className="w-4 h-4" />,
  Cancelled: <MdDelete className="w-4 h-4" />,
  "Awaiting Parts": <MdInfo className="w-4 h-4" />,
  "On Hold": <MdWarning className="w-4 h-4" />,
  "Ready for Pickup": <MdCheckCircle className="w-4 h-4" />,
};

const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-700 border-slate-200",
  medium: "bg-blue-100 text-blue-700 border-blue-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  urgent: "bg-red-100 text-red-700 border-red-200",
};

const priorityIcons: Record<string, React.ReactNode> = {
  low: <MdPriorityHigh className="w-3 h-3" />,
  medium: <MdPriorityHigh className="w-3 h-3" />,
  high: <MdPriorityHigh className="w-3 h-3" />,
  urgent: <MdPriorityHigh className="w-3 h-3" />,
};

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
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!serviceId) return;
    const fetchService = async () => {
      setLoading(true);
      try {
        const docSnap = await getDoc(doc(db, "services", serviceId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          const serviceData: Service = {
            id: docSnap.id,
            name: data.name || "",
            description: data.description || "",
            price: data.price || 0,
            shopId: data.shopId || "",
            branchId: data.branchId || "",
            created_by: data.created_by,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            paymentStatus: data.paymentStatus,
            status: data.status || "To Do",
            technician_id: data.technician_id || "",
            priority: data.priority || "medium",
            estimatedDuration: data.estimatedDuration || 60,
            actualDuration: data.actualDuration || 0,
            scheduledDate: data.scheduledDate?.toDate(),
            completedDate: data.completedDate?.toDate(),
            notes: data.notes || "",
            workNotes: data.workNotes || [],
            partsUsed: data.partsUsed || [],
            customerFeedback: data.customerFeedback
              ? {
                  ...data.customerFeedback,
                  date: data.customerFeedback.date?.toDate() || new Date(),
                }
              : undefined,
            qualityScore: data.qualityScore,
            estimatedCompletion: data.estimatedCompletion?.toDate(),
            actualCompletion: data.actualCompletion?.toDate(),
            device: data.device || {},
            customer: data.customer || {},
          };
          setService(serviceData);
          setStatus(serviceData.status || "To Do");
          setBranchId(serviceData.branchId);
        } else {
          setError("Service not found");
        }
      } catch (err) {
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
      } catch {
        // Error fetching branches
      }
    };

    const fetchTechnicians = async () => {
      if (!user?.shopId) return;
      try {
        const techniciansRef = collection(db, "technicians");
        const q = query(techniciansRef, where("shopId", "==", user.shopId));
        const querySnapshot = await getDocs(q);
        const techniciansData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Technician[];
        setTechnicians(techniciansData);
      } catch {
        // Error fetching technicians
      }
    };

    fetchService();
    fetchBranches();
    fetchTechnicians();
  }, [serviceId, user?.shopId]);

  const handleEdit = async (data: { service: { name: string; description: string; price: string; branchId: string; technician_id?: string }; customer: { name: string; phone?: string; place?: string }; device: { brand: string; model: string; imei: string; color: string } }) => {
    setError(null);
    setLoading(true);
    try {
      const updateData = {
        name: data.service.name,
        description: data.service.description,
        price: Number(data.service.price),
        branchId: data.service.branchId,
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
              ...data.service,
              price: Number(data.service.price),
              customer: data.customer,
              device: data.device,
              branchId: data.service.branchId,
              technician_id: data.service.technician_id || (user?.role === "technician" ? user.id : ""),
              status,
              updatedAt: new Date(),
              createdAt: prev.createdAt,
            }
          : null
      );
      setEditing(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this service?")) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "services", serviceId!));
      router.push("/services");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
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
        await updateDoc(doc(db, "services", serviceId), {
          status: newStatus,
          updatedAt: new Date(),
        });
        setService((prev) => (prev ? { ...prev, status: newStatus, updatedAt: new Date() } : null));

        // Add to status history
        const historyEntry: StatusHistory = {
          status: newStatus,
          timestamp: new Date(),
          updatedBy: user?.name || "Unknown",
        };
        setStatusHistory((prev) => [historyEntry, ...prev]);
      } catch {
        setStatus(service?.status || "To Do"); // Revert on error
      } finally {
        setUpdatingStatus(false);
      }
    }
  };

  const getTechnicianName = (technicianId: string) => {
    const technician = technicians.find((t) => t.id === technicianId);
    return technician?.name || "Not assigned";
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getPriorityLabel = (priority: string) => {
    const labels = {
      low: "Low",
      medium: "Medium",
      high: "High",
      urgent: "Urgent",
    };
    return labels[priority as keyof typeof labels] || "Medium";
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return "Not scheduled";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderStars = useCallback((rating: number) => {
    return Array.from({ length: 5 }, (_, i) => <MdStar key={`star-${rating}-${i}`} className={`w-4 h-4 ${i < rating ? "text-yellow-400 fill-current" : "text-gray-300"}`} />);
  }, []);

  // Memoized handlers to avoid arrow functions in JSX
  const handleGoBack = useCallback(() => router.back(), [router]);
  const handleReload = useCallback(() => window.location.reload(), []);
  const handleToggleShowHistory = useCallback(() => setShowHistory((prev) => !prev), []);
  const handleGenerateInvoice = useCallback(() => router.push(`/invoices/details?id=${service?.id}`), [router, service?.id]);
  const handleCancelEdit = useCallback(() => setEditing(false), []);
  const handleEditClick = useCallback(() => setEditing(true), []);
  const handlePrint = useCallback(() => window.print(), []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          </div>
          <p className="text-slate-600 font-medium">Loading service details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <MdWarning className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Error Loading Service</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={handleGoBack} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Go Back
            </button>
            <button onClick={handleReload} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
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
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-6">
            <button onClick={handleCancelEdit} className="mr-4 p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <MdArrowBack className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-slate-900">Edit Service</h1>
          </div>

          <ServiceForm
            key={editing ? "editing" : "viewing"}
            onSubmit={handleEdit}
            loading={loading}
            editing={true}
            error={error}
            branches={branches}
            branchId={branchId}
            setBranchId={setBranchId}
            user={convertedUser}
            shopId={user?.shopId}
            initialData={{
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
            }}
            onCancelEdit={handleCancelEdit}
          />
        </div>
      </div>
    );
  }

  const branchName = branches.find((b) => b.id === service.branchId)?.name || service.branchId;
  const createdAt = service.createdAt ? new Date(service.createdAt) : null;
  const updatedAt = service.updatedAt ? new Date(service.updatedAt) : null;
  const statusColor = statusColors[status] || "bg-slate-100 text-slate-700 border-slate-200";
  const statusIcon = statusIcons[status] || <MdInfo className="w-4 h-4" />;
  const priorityColor = priorityColors[service.priority || "medium"];
  const priorityIcon = priorityIcons[service.priority || "medium"];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={handleGoBack} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <MdArrowBack className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{service.name}</h1>
              <p className="text-slate-500">ID: #{service.id.slice(-6)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleToggleShowHistory} className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
              <MdHistory className="w-4 h-4" />
              History
            </button>
            <button onClick={handleDelete} className="flex items-center gap-2 px-3 py-2 border border-red-300 text-red-600 bg-white rounded-lg font-medium hover:bg-red-50 transition-colors">
              <MdDelete className="w-4 h-4" />
              Delete
            </button>
            <button onClick={handleEditClick} className="flex items-center gap-2 px-3 py-2 border border-slate-300 text-slate-700 bg-white rounded-lg font-medium hover:bg-slate-50 transition-colors">
              <MdEdit className="w-4 h-4" />
              Edit
            </button>
            <button onClick={handleGenerateInvoice} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
              <MdReceipt className="w-4 h-4" />
              Generate Invoice
            </button>
          </div>
        </div>

        {/* Status and Priority */}
        <div className="flex items-center gap-4 mb-8">
          <div className={`${statusColor} flex items-center gap-2 px-4 py-2 rounded-lg font-semibold border`}>
            {statusIcon}
            {status}
          </div>
          <div className={`${priorityColor} flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold border`}>
            {priorityIcon}
            {getPriorityLabel(service.priority || "medium")}
          </div>
          <select value={status} onChange={handleStatusChange} disabled={updatingStatus} className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 bg-white">
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {updatingStatus && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-200 border-t-blue-600"></div>
              Updating...
            </div>
          )}
        </div>

        {/* Status History */}
        {showHistory && (
          <div className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <MdHistory className="w-5 h-5 text-blue-600" />
              Status History
            </h3>
            <div className="space-y-3">
              {statusHistory.length > 0 ? (
                statusHistory.map((entry, index) => (
                  <div key={`history-${entry.status}-${entry.timestamp.getTime()}-${index}`} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className={`${statusColors[entry.status]} px-3 py-1 rounded-full text-sm font-medium`}>{entry.status}</div>
                      <span className="text-sm text-slate-600">by {entry.updatedBy}</span>
                    </div>
                    <span className="text-sm text-slate-500">{entry.timestamp.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-center py-4">No status history available</p>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Service Information */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <MdBuild className="w-5 h-5 text-blue-600" />
                Service Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-slate-500 text-sm mb-1">Service Name</div>
                  <div className="font-medium text-slate-900">{service.name}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-sm mb-1">Price</div>
                  <div className="font-bold text-slate-900 text-lg">₹{service.price?.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-sm mb-1">Branch</div>
                  <div className="font-medium text-slate-900">{branchName}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-sm mb-1">Assigned Technician</div>
                  <div className="font-medium text-slate-900">{service.technician_id ? getTechnicianName(service.technician_id) : "Not assigned"}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-sm mb-1">Estimated Duration</div>
                  <div className="font-medium text-slate-900">{formatDuration(service.estimatedDuration || 60)}</div>
                </div>
                {service.actualDuration && (
                  <div>
                    <div className="text-slate-500 text-sm mb-1">Actual Duration</div>
                    <div className="font-medium text-slate-900">{formatDuration(service.actualDuration)}</div>
                  </div>
                )}
                <div className="md:col-span-2">
                  <div className="text-slate-500 text-sm mb-1">Description</div>
                  <div className="font-medium text-slate-900 bg-slate-50 p-3 rounded-lg">{service.description || "No description provided"}</div>
                </div>
              </div>
            </div>

            {/* Device Information */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <MdDevices className="w-5 h-5 text-green-600" />
                Device Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-slate-500 text-sm mb-1">Type</div>
                  <div className="font-medium text-slate-900">{service.device?.type || "Not specified"}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-sm mb-1">Brand</div>
                  <div className="font-medium text-slate-900">{service.device?.brand || "Not specified"}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-sm mb-1">Model</div>
                  <div className="font-medium text-slate-900">{service.device?.model || "Not specified"}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-sm mb-1">IMEI</div>
                  <div className="font-medium text-slate-900 font-mono text-sm">{service.device?.imei || "Not specified"}</div>
                </div>
                {service.device?.color && (
                  <div>
                    <div className="text-slate-500 text-sm mb-1">Color</div>
                    <div className="font-medium text-slate-900">{service.device.color}</div>
                  </div>
                )}
                {service.device?.issue && (
                  <div className="md:col-span-2">
                    <div className="text-slate-500 text-sm mb-1">Issue Description</div>
                    <div className="font-medium text-slate-900 bg-slate-50 p-3 rounded-lg">{service.device.issue}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Customer Information */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <MdPerson className="w-5 h-5 text-purple-600" />
                Customer Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-slate-500 text-sm mb-1">Name</div>
                  <div className="font-medium text-slate-900">{service.customer?.name || "Not specified"}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-sm mb-1">Phone</div>
                  <div className="font-medium text-slate-900">
                    {service.customer?.phone ? (
                      <a href={`tel:${service.customer.phone}`} className="text-blue-600 hover:text-blue-800">
                        {service.customer.phone}
                      </a>
                    ) : (
                      "Not specified"
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-sm mb-1">Email</div>
                  <div className="font-medium text-slate-900">
                    {service.customer?.email ? (
                      <a href={`mailto:${service.customer.email}`} className="text-blue-600 hover:text-blue-800">
                        {service.customer.email}
                      </a>
                    ) : (
                      "Not specified"
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-sm mb-1">Place</div>
                  <div className="font-medium text-slate-900">{service.customer?.place || "Not specified"}</div>
                </div>
                {service.customer?.address && (
                  <div className="md:col-span-2">
                    <div className="text-slate-500 text-sm mb-1">Address</div>
                    <div className="font-medium text-slate-900 bg-slate-50 p-3 rounded-lg">{service.customer.address}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes and Work Notes */}
            {(service.notes || (service.workNotes && service.workNotes.length > 0)) && (
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <MdNotes className="w-5 h-5 text-amber-600" />
                  Notes & Work Notes
                </h2>
                {service.notes && (
                  <div className="mb-4">
                    <div className="text-slate-500 text-sm mb-1">General Notes</div>
                    <div className="font-medium text-slate-900 bg-slate-50 p-3 rounded-lg">{service.notes}</div>
                  </div>
                )}
                {service.workNotes && service.workNotes.length > 0 && (
                  <div>
                    <div className="text-slate-500 text-sm mb-2">Work Notes</div>
                    <div className="space-y-2">
                      {service.workNotes.map((note, index) => (
                        <div key={`worknote-${index}-${note.substring(0, 10)}`} className="bg-slate-50 p-3 rounded-lg border-l-4 border-blue-500">
                          <div className="font-medium text-slate-900">{note}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Parts Used */}
            {service.partsUsed && service.partsUsed.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <MdInventory className="w-5 h-5 text-emerald-600" />
                  Parts Used
                </h2>
                <div className="space-y-3">
                  {service.partsUsed.map((part, index) => (
                    <div key={`part-${index}-${part.name}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <div className="font-medium text-slate-900">{part.name}</div>
                        <div className="text-sm text-slate-500">Qty: {part.quantity}</div>
                      </div>
                      <div className="font-semibold text-slate-900">₹{part.cost.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Customer Feedback */}
            {service.customerFeedback && (
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <MdFeedback className="w-5 h-5 text-yellow-600" />
                  Customer Feedback
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-sm">Rating:</span>
                    <div className="flex items-center gap-1">{renderStars(service.customerFeedback.rating)}</div>
                    <span className="text-sm font-medium text-slate-900">({service.customerFeedback.rating}/5)</span>
                  </div>
                  {service.customerFeedback.comment && (
                    <div>
                      <div className="text-slate-500 text-sm mb-1">Comment</div>
                      <div className="font-medium text-slate-900 bg-slate-50 p-3 rounded-lg">{service.customerFeedback.comment}</div>
                    </div>
                  )}
                  <div className="text-sm text-slate-500">Date: {service.customerFeedback.date.toLocaleDateString()}</div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-semibold text-lg mb-4">Quick Info</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-slate-500 text-sm mb-1">Created</div>
                  <div className="font-medium text-slate-900">{createdAt ? createdAt.toLocaleDateString() : "-"}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-sm mb-1">Last Updated</div>
                  <div className="font-medium text-slate-900">{updatedAt ? updatedAt.toLocaleDateString() : "-"}</div>
                </div>
                {service.scheduledDate && (
                  <div>
                    <div className="text-slate-500 text-sm mb-1">Scheduled Date</div>
                    <div className="font-medium text-slate-900">{formatDate(service.scheduledDate)}</div>
                  </div>
                )}
                {service.completedDate && (
                  <div>
                    <div className="text-slate-500 text-sm mb-1">Completed Date</div>
                    <div className="font-medium text-slate-900">{formatDate(service.completedDate)}</div>
                  </div>
                )}
                {service.estimatedCompletion && (
                  <div>
                    <div className="text-slate-500 text-sm mb-1">Estimated Completion</div>
                    <div className="font-medium text-slate-900">{formatDate(service.estimatedCompletion)}</div>
                  </div>
                )}
                {service.actualCompletion && (
                  <div>
                    <div className="text-slate-500 text-sm mb-1">Actual Completion</div>
                    <div className="font-medium text-slate-900">{formatDate(service.actualCompletion)}</div>
                  </div>
                )}
                {service.qualityScore && (
                  <div>
                    <div className="text-slate-500 text-sm mb-1">Quality Score</div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">{renderStars(Math.round(service.qualityScore))}</div>
                      <span className="font-medium text-slate-900">({service.qualityScore}/5)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-semibold text-lg mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button onClick={handleEditClick} className="w-full flex items-center gap-2 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <MdEdit className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Edit Service</span>
                </button>
                <button onClick={handleGenerateInvoice} className="w-full flex items-center gap-2 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <MdReceipt className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Generate Invoice</span>
                </button>
                <button onClick={handleToggleShowHistory} className="w-full flex items-center gap-2 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <MdHistory className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium">View History</span>
                </button>
                <button onClick={handlePrint} className="w-full flex items-center gap-2 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <MdPrint className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium">Print Details</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ServiceDetailsPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 font-medium">Loading service details...</p>
          </div>
        </div>
      }
    >
      <ServiceDetailsPage />
    </Suspense>
  );
}
