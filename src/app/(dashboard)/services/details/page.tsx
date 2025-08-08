"use client";
import { Suspense } from "react";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { useUser } from "@/hooks";
import ServiceForm from "@/modules/service/ServiceForm";
import type { Branch } from "@/types";
import {  
  MdPerson, 
  MdPhone, 
  MdDevices, 
  MdBusiness, 
  MdLabel, 
  MdConfirmationNumber, 
  MdBuild, 
  MdAttachMoney,
  MdArrowBack,
  MdEdit,
  MdDelete,
  MdReceipt,
  MdSchedule,
  MdCheckCircle,
  MdWarning,
  MdInfo,
  MdLocationOn
} from "react-icons/md";

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  shop_id: string;
  branch_id: string;
  created_by?: { role: string; name: string };
  createdAt: Date;
  updatedAt: Date;
  paymentStatus?: string;
  status?: string;
  device?: { model: string; brand: string; serial?: string };
      customer?: { name: string; phone?: string; place?: string };
}

const STATUS_OPTIONS = ["To Do", "In Progress", "Completed", "Pending", "Cancelled", "Awaiting Parts", "On Hold", "Ready for Pickup"];
const statusColors: Record<string, string> = {
  "To Do": "bg-gray-100 text-gray-700 border border-gray-200",
  Completed: "bg-green-100 text-green-700 border border-green-200",
  "In Progress": "bg-yellow-100 text-yellow-700 border border-yellow-200",
  Pending: "bg-gray-100 text-gray-700 border border-gray-200",
  Cancelled: "bg-red-100 text-red-700 border border-red-200",
  "Awaiting Parts": "bg-blue-100 text-blue-700 border border-blue-200",
  "On Hold": "bg-orange-100 text-orange-700 border border-orange-200",
  "Ready for Pickup": "bg-purple-100 text-purple-700 border border-purple-200",
};

const statusIcons: Record<string, React.ReactNode> = {
  "To Do": <MdSchedule className="w-5 h-5" />,
  Completed: <MdCheckCircle className="w-5 h-5" />,
  "In Progress": <MdWarning className="w-5 h-5" />,
  Pending: <MdSchedule className="w-5 h-5" />,
  Cancelled: <MdDelete className="w-5 h-5" />,
  "Awaiting Parts": <MdInfo className="w-5 h-5" />,
  "On Hold": <MdWarning className="w-5 h-5" />,
  "Ready for Pickup": <MdCheckCircle className="w-5 h-5" />,
};

function ServiceDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceId = searchParams.get("id");
  const { user } = useUser();
  const [service, setService] = useState<Service | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("To Do");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!serviceId) return;
    const fetchService = async () => {
      setLoading(true);
      try {
        const docSnap = await getDoc(doc(db, "services", serviceId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setService({
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt && typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : undefined,
            updatedAt: data.updatedAt && typeof data.updatedAt.toDate === 'function' ? data.updatedAt.toDate() : undefined,
          } as Service);
          setBranchId(data.branchId || "");
          setStatus(data.status || "To Do");
        } else {
          setError("Service not found");
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };
    fetchService();
  }, [serviceId]);

  useEffect(() => {
    // Fetch all branches for branch name display
    const fetchBranches = async () => {
      if (!user?.shopId) return;
      const querySnapshot = await getDocs(collection(db, `shops/${user.shopId}/branches`));
      setBranches(querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Branch)));
    };
    fetchBranches();
  }, [user?.shopId]);

  const handleEdit = async (data: {
    service: { name: string; description: string; price: string; branch_id: string };
    customer: { name: string; phone?: string; place?: string };
    device: { brand: string; model: string; serial: string; color: string };
  }) => {
    setError(null);
    setLoading(true);
    try {
      await updateDoc(doc(db, "services", serviceId!), {
        name: data.service.name,
        description: data.service.description,
        price: Number(data.service.price),
        branch_id: data.service.branch_id,
        customer: data.customer,
        device: data.device,
        status,
        updatedAt: new Date(),
      });
      setService((prev) => prev ? { ...prev, ...data.service, price: Number(data.service.price), customer: data.customer, device: data.device, branch_id: data.service.branch_id, status, updatedAt: new Date(), createdAt: prev.createdAt } : null);
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
          updatedAt: new Date() 
        });
        setService((prev) => prev ? { ...prev, status: newStatus, updatedAt: new Date() } : null);
      } catch (err) {
        console.error("Error updating status:", err);
        setStatus(service?.status || "To Do"); // Revert on error
      } finally {
        setUpdatingStatus(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading service details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MdWarning className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!service) return null;

  if (editing) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-6">
            <button 
              onClick={() => setEditing(false)} 
              className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MdArrowBack className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Edit Service</h1>
          </div>
          <ServiceForm
            onSubmit={handleEdit}
            loading={loading}
            editing={true}
            error={error}
            branches={branches}
            branchId={branchId}
            setBranchId={setBranchId}
            isShopAdmin={user?.role === "shop_admin"}
            isBranchAdmin={user?.role === "branch_admin"}
            userBranchId={user?.branchId}
            initialData={{
              customer: {
                name: service.customer?.name || "",
                phone: service.customer?.phone || "",
                place: service.customer?.place || "",
              },
              device: {
                brand: typeof service.device?.brand === "string" ? service.device.brand : "",
                model: typeof service.device?.model === "string" ? service.device.model : "",
                serial: typeof service.device?.serial === "string" ? service.device.serial : "",
                color: typeof (service.device as Record<string, unknown>)?.color === "string"
                  ? (service.device as Record<string, unknown>).color as string
                  : "",
              },
              service: { name: service.name, description: service.description, price: String(service.price) },
            }}
            onCancelEdit={() => setEditing(false)}
          />
        </div>
      </div>
    );
  }

  const branchName = branches.find(b => b.id === service.branch_id)?.name || service.branch_id;
  const createdAt = service.createdAt ? new Date(service.createdAt) : null;
  const updatedAt = service.updatedAt ? new Date(service.updatedAt) : null;
  const statusColor = statusColors[status] || "bg-gray-100 text-gray-700 border border-gray-200";
  const statusIcon = statusIcons[status] || <MdInfo className="w-5 h-5" />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.back()} 
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MdArrowBack className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{service.name}</h1>
                <p className="text-gray-600">Service ID: #{service.id.slice(-6)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 bg-white rounded-lg font-medium hover:bg-red-50 transition-colors"
              >
                <MdDelete className="w-5 h-5" />
                Delete
              </button>
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                <MdEdit className="w-5 h-5" />
                Edit
              </button>
              <button
                onClick={() => {
                  router.push(`/invoices/details?id=${service.id}`);
                }}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <MdReceipt className="w-5 h-5" />
                Generate Invoice
              </button>
            </div>
          </div>
        </div>

        {/* Status Management */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`${statusColor} flex items-center gap-2 px-4 py-2 rounded-lg font-semibold`}>
                {statusIcon}
                {status}
              </div>
              <select
                value={status}
                onChange={handleStatusChange}
                disabled={updatingStatus}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {updatingStatus && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Updating...
                </div>
              )}
            </div>
            <div className="text-right text-sm text-gray-500">
              <div>Last updated: {updatedAt ? updatedAt.toLocaleString() : "-"}</div>
              <div>Created: {createdAt ? createdAt.toLocaleDateString() : "-"}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Device Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <MdDevices className="w-5 h-5 text-blue-600" />
              Device Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-1 text-gray-500 text-sm mb-1">
                  <MdDevices className="w-4 h-4" />
                  Type
                </div>
                <div className="font-medium text-gray-900">
                  {service.device && typeof service.device === "object" && "type" in service.device 
                    ? String((service.device as Record<string, unknown>).type || "") 
                    : "Not specified"}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-gray-500 text-sm mb-1">
                  <MdBusiness className="w-4 h-4" />
                  Brand
                </div>
                <div className="font-medium text-gray-900">
                  {service.device && typeof service.device === "object" && "brand" in service.device 
                    ? String((service.device as Record<string, unknown>).brand || "") 
                    : "Not specified"}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-gray-500 text-sm mb-1">
                  <MdLabel className="w-4 h-4" />
                  Model
                </div>
                <div className="font-medium text-gray-900">
                  {service.device && typeof service.device === "object" && "model" in service.device 
                    ? String((service.device as Record<string, unknown>).model || "") 
                    : "Not specified"}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-gray-500 text-sm mb-1">
                  <MdConfirmationNumber className="w-4 h-4" />
                  IMEI
                </div>
                <div className="font-medium text-gray-900">
                  {service.device && typeof service.device === "object" && "serial" in service.device 
                    ? String((service.device as Record<string, unknown>).serial || "") 
                    : "Not specified"}
                </div>
              </div>
            </div>
          </div>

          {/* Service Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <MdBuild className="w-5 h-5 text-green-600" />
              Service Information
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-1 text-gray-500 text-sm mb-1">
                  <MdBuild className="w-4 h-4" />
                  Service Name
                </div>
                <div className="font-medium text-gray-900">{service.name}</div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-gray-500 text-sm mb-1">
                  <MdAttachMoney className="w-4 h-4" />
                  Price
                </div>
                <div className="font-medium text-gray-900 text-lg">₹{service.price?.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-gray-500 text-sm mb-1">Branch</div>
                <div className="font-medium text-gray-900">{branchName}</div>
              </div>
              <div>
                <div className="text-gray-500 text-sm mb-1">Description</div>
                <div className="font-medium text-gray-900">{service.description}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <MdPerson className="w-5 h-5 text-purple-600" />
            Customer Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center gap-1 text-gray-500 text-sm mb-1">
                <MdPerson className="w-4 h-4" />
                Name
              </div>
              <div className="font-medium text-gray-900">{service.customer?.name || "Not specified"}</div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-gray-500 text-sm mb-1">
                <MdPhone className="w-4 h-4" />
                Phone
              </div>
              <div className="font-medium text-gray-900">{service.customer?.phone || "Not specified"}</div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-gray-500 text-sm mb-1">
                <MdLocationOn className="w-4 h-4" />
                Place
              </div>
              <div className="font-medium text-gray-900">{service.customer?.place || "Not specified"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ServiceDetailsPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ServiceDetailsPage />
    </Suspense>
  );
} 