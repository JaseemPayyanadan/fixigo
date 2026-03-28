"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { MdArrowBack, MdBuild, MdCheckCircle, MdDelete, MdDevices, MdEdit, MdFeedback, MdHistory, MdInfo, MdInventory, MdNotes, MdPerson, MdPrint, MdPriorityHigh, MdRefresh, MdSchedule, MdStar, MdWarning } from "react-icons/md";

import { useUser } from "@/hooks";
import { authUserToUser } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { normalizeStatus } from "@/lib/statusUtils";
import ServiceForm from "@/components/service/ServiceForm";
import type { Branch, Technician } from "@/types";

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

const STATUS_OPTIONS = ["To Do", "In Progress", "Completed", "Pending", "Cancelled", "Awaiting Parts", "Ready for Pickup"];

const statusColors: Record<string, string> = {
  "To Do": "bg-blue-50 text-blue-700 border-blue-200",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "In Progress": "bg-amber-50 text-amber-700 border-amber-200",
  Pending: "bg-blue-50 text-blue-700 border-blue-200",
  Cancelled: "bg-red-50 text-red-700 border-red-200",
  "Awaiting Parts": "bg-orange-50 text-orange-700 border-orange-200",
  "Ready for Pickup": "bg-cyan-50 text-cyan-700 border-cyan-200",
};

const statusIcons: Record<string, React.ReactNode> = {
  "To Do": <MdSchedule className="w-4 h-4" />,
  Completed: <MdCheckCircle className="w-4 h-4" />,
  "In Progress": <MdBuild className="w-4 h-4" />,
  Pending: <MdSchedule className="w-4 h-4" />,
  Cancelled: <MdDelete className="w-4 h-4" />,
  "Awaiting Parts": <MdInfo className="w-4 h-4" />,
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
  const [statusUpdateSuccess, setStatusUpdateSuccess] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    serviceInfo: true,
    deviceInfo: false,
    customerInfo: false,
    technicianInfo: false,
    quickInfo: false,
    notes: false,
    parts: false,
    feedback: false,
    history: false
  });
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!serviceId) return;

    const fetchService = async () => {
      try {
        const serviceDoc = await getDoc(doc(db, "services", serviceId));
        if (serviceDoc.exists()) {
          const data = serviceDoc.data();
          
          console.log("🔍 Raw service data from Firestore:", {
            id: serviceDoc.id,
            name: data.name,
            branchId: data.branchId,
            technician_id: data.technician_id,
            shopId: data.shopId,
            allFields: Object.keys(data)
          });
          
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
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          };
          setService(serviceData);
          const normalizedStatus = normalizeStatus(serviceData.status || "pending");
          console.log('🔍 Service details status processing:', {
            originalStatus: serviceData.status,
            normalizedStatus,
            serviceId: serviceData.id
          });
          setStatus(serviceData.status || "To Do");
          
          console.log("✅ Final service object:", {
            id: serviceData.id,
            name: serviceData.name,
            branchId: serviceData.branchId,
            technician_id: serviceData.technician_id,
            status: serviceData.status
          });
          
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
        const techniciansRef = collection(db, "technicians");
        const q = query(techniciansRef, where("shopId", "==", user.shopId));
        const querySnapshot = await getDocs(q);
        const techniciansData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Technician[];
        
        console.log("🔍 Fetched technicians:", {
          total: techniciansData.length,
          technicians: techniciansData.map(t => ({
            id: t.id,
            name: t.name,
            userId: t.userId,
            shopId: t.shopId,
            branchId: t.branchId
          }))
        });
        
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
    
    console.log("🔍 handleEdit received data:", {
      service: data.service,
      customer: data.customer,
      device: data.device,
      userRole: user?.role,
      userBranchId: user?.branchId
    });
    
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

      console.log("🔍 Updating service with data:", updateData);

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
        setStatusUpdateSuccess(true);
        setTimeout(() => setStatusUpdateSuccess(false), 3000); // Hide success message after 3 seconds
      } catch (err) {
        console.error("Error updating status:", err);
        setStatus(service?.status || "To Do"); // Revert on error
        setError("Failed to update status. Please try again.");
      } finally {
        setUpdatingStatus(false);
      }
    }
  };

  const getTechnicianName = (technicianId: string) => {
    if (!technicianId) return "Not assigned";
    
    const technician = technicians.find((t) => t.id === technicianId || t.userId === technicianId);
    
    return technician?.name || `Unknown Technician (${technicianId})`;
  };

  const getAssignedTechnicianInfo = () => {
    if (!service) return { name: "Not assigned", id: null, technician: null };
    
    // Use only technician_id field
    const technicianId = service.technician_id;
    
    console.log("🔍 Debug getAssignedTechnicianInfo:", {
      serviceId: service.id,
      technician_id: technicianId,
      totalTechnicians: technicians.length,
      technicianIds: technicians.map(t => ({ id: t.id, name: t.name, userId: t.userId }))
    });
    
    if (!technicianId) {
      return { name: "Not assigned", id: null, technician: null };
    }
    
    const technician = technicians.find(
      (t) => t.id === technicianId || t.userId === technicianId
    );
    
    console.log("🔍 Technician lookup result:", {
      technicianId,
      found: !!technician,
      technician: technician ? { id: technician.id, name: technician.name } : null
    });
    
    return {
      name: technician?.name || `Unknown Technician (${technicianId})`,
      id: technicianId,
      technician: technician
    };
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
  const handleCancelEdit = useCallback(() => setEditing(false), []);
  const handleEditClick = useCallback(() => setEditing(true), []);
  const handlePrint = useCallback(() => window.print(), []);
  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);
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
              
              console.log("🔍 ServiceForm initialData:", {
                service: initialData.service,
                customer: initialData.customer,
                device: initialData.device,
                branches: branches.length,
                technicians: technicians.length
              });
              
              return initialData;
            })()}
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
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header - Sticky */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleGoBack} 
              className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <MdArrowBack className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-slate-900">Service Details</h1>
          </div>
          <div className="relative dropdown-container">
            <button 
              onClick={toggleDropdown}
              className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="More options"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            
            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                <button 
                  onClick={() => {
                    setShowDropdown(false);
                    handleEditClick();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <MdEdit className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Edit Service</span>
                </button>
                <button 
                  onClick={() => {
                    setShowDropdown(false);
                    handlePrint();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <MdPrint className="w-4 h-4 text-slate-600" />
                  <span className="text-sm font-medium">Print Details</span>
                </button>
                <button 
                  onClick={() => {
                    setShowDropdown(false);
                    handleToggleShowHistory();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <MdHistory className="w-4 h-4 text-slate-600" />
                  <span className="text-sm font-medium">View History</span>
                </button>
                <hr className="my-1 border-slate-200" />
                <button 
                  onClick={() => {
                    setShowDropdown(false);
                    handleDelete();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-600 hover:bg-red-50 transition-colors"
                >
                  <MdDelete className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium">Delete Service</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Service Summary Card - Hero Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-900 mb-2">{service.name}</h2>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="font-mono bg-slate-100 px-2 py-1 rounded text-xs">#{service.id.slice(-8)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Created:</span>
                      <span>{createdAt ? createdAt.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      }) : 'Unknown'}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Updated:</span>
                      <span>{updatedAt ? updatedAt.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      }) : 'Unknown'}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">₹{service.price?.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-1">Service Price</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <div className={`${statusColor} flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm border`}>
                {statusIcon}
                <span>{status}</span>
              </div>
              <div className={`${priorityColor} flex items-center gap-1 px-2 py-1 rounded-md font-medium text-xs border`}>
                {priorityIcon}
                <span>{getPriorityLabel(service.priority || "medium")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Update Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-slate-600 font-medium text-sm">Update Status:</span>
            <select 
              value={status} 
              onChange={handleStatusChange} 
              disabled={updatingStatus} 
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 bg-white"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          {updatingStatus && (
            <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-200 border-t-blue-600"></div>
              Updating...
            </div>
          )}
          {statusUpdateSuccess && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
              <MdCheckCircle className="w-4 h-4" />
              Status updated successfully!
            </div>
          )}
        </div>

        {/* Collapsible Sections */}
        <div className="space-y-3">
          {/* Service Information */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <button 
              onClick={() => toggleSection('serviceInfo')}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <MdBuild className="w-4 h-4 text-blue-600" />
                </div>
                <span className="font-semibold text-slate-900">Service Information</span>
              </div>
              <svg 
                className={`w-5 h-5 text-slate-400 transition-transform ${expandedSections.serviceInfo ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.serviceInfo && (
              <div className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <div className="text-slate-500 text-xs font-medium mb-1">Service Name</div>
                    <div className="font-semibold text-slate-900">{service.name}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs font-medium mb-1">Branch</div>
                    <div className="font-semibold text-slate-900">{branchName}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs font-medium mb-1">Assigned Technician</div>
                    <div className="font-semibold text-slate-900">
                      {(() => {
                        const techInfo = getAssignedTechnicianInfo();
                        return (
                          <div className="space-y-1">
                            <div>{techInfo.name}</div>
                            {techInfo.id && (
                              <div className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded">
                                ID: {techInfo.id}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  {service.actualDuration && (
                    <div>
                      <div className="text-slate-500 text-xs font-medium mb-1">Actual Duration</div>
                      <div className="font-semibold text-slate-900">{formatDuration(service.actualDuration)}</div>
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-slate-500 text-xs font-medium mb-1">Description</div>
                  <div className="font-medium text-slate-900 bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm leading-relaxed">
                    {service.description || "No description provided"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Device Information */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <button 
              onClick={() => toggleSection('deviceInfo')}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <MdDevices className="w-4 h-4 text-green-600" />
                </div>
                <span className="font-semibold text-slate-900">Device Information</span>
              </div>
              <svg 
                className={`w-5 h-5 text-slate-400 transition-transform ${expandedSections.deviceInfo ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.deviceInfo && (
              <div className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <div className="text-slate-500 text-xs font-medium mb-1">Type</div>
                    <div className="font-semibold text-slate-900">{service.device?.type || "Not specified"}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs font-medium mb-1">Brand</div>
                    <div className="font-semibold text-slate-900">{service.device?.brand || "Not specified"}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs font-medium mb-1">Model</div>
                    <div className="font-semibold text-slate-900">{service.device?.model || "Not specified"}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs font-medium mb-1">IMEI</div>
                    <div className="font-semibold text-slate-900 font-mono bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                      {service.device?.imei || "Not specified"}
                    </div>
                  </div>
                  {service.device?.color && (
                    <div>
                      <div className="text-slate-500 text-xs font-medium mb-1">Color</div>
                      <div className="font-semibold text-slate-900">{service.device.color}</div>
                    </div>
                  )}
                </div>
                {service.device?.issue && (
                  <div>
                    <div className="text-slate-500 text-xs font-medium mb-1">Issue Description</div>
                    <div className="font-medium text-slate-900 bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm leading-relaxed">
                      {service.device.issue}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Customer Information */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <button 
              onClick={() => toggleSection('customerInfo')}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <MdPerson className="w-4 h-4 text-purple-600" />
                </div>
                <span className="font-semibold text-slate-900">Customer Information</span>
              </div>
              <svg 
                className={`w-5 h-5 text-slate-400 transition-transform ${expandedSections.customerInfo ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.customerInfo && (
              <div className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <div className="text-slate-500 text-xs font-medium mb-1">Name</div>
                    <div className="font-semibold text-slate-900">{service.customer?.name || "Not specified"}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs font-medium mb-1">Phone</div>
                    <div className="font-semibold text-slate-900">{service.customer?.phone || "Not specified"}</div>
                  </div>
                  {service.customer?.email && (
                    <div>
                      <div className="text-slate-500 text-xs font-medium mb-1">Email</div>
                      <div className="font-semibold text-slate-900">{service.customer.email}</div>
                    </div>
                  )}
                  {service.customer?.address && (
                    <div>
                      <div className="text-slate-500 text-xs font-medium mb-1">Address</div>
                      <div className="font-semibold text-slate-900">{service.customer.address}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Technician Information */}
          {(() => {
            const techInfo = getAssignedTechnicianInfo();
            if (!techInfo.id) return null;
            
            return (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <button 
                  onClick={() => toggleSection('technicianInfo')}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <MdPerson className="w-4 h-4 text-orange-600" />
                    </div>
                    <span className="font-semibold text-slate-900">Assigned Technician</span>
                  </div>
                  <svg 
                    className={`w-5 h-5 text-slate-400 transition-transform ${expandedSections.technicianInfo ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedSections.technicianInfo && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <div className="text-slate-500 text-xs font-medium mb-1">Name</div>
                        <div className="font-semibold text-slate-900">{techInfo.name}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-xs font-medium mb-1">Technician ID</div>
                        <div className="font-mono text-slate-900 bg-slate-100 px-3 py-2 rounded-lg">
                          {techInfo.id}
                        </div>
                      </div>
                      {techInfo.technician?.phone && (
                        <div>
                          <div className="text-slate-500 text-xs font-medium mb-1">Phone</div>
                          <div className="font-semibold text-slate-900">{techInfo.technician.phone}</div>
                        </div>
                      )}
                      {techInfo.technician?.email && (
                        <div>
                          <div className="text-slate-500 text-xs font-medium mb-1">Email</div>
                          <div className="font-semibold text-slate-900">{techInfo.technician.email}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Quick Info */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <button 
              onClick={() => toggleSection('quickInfo')}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                  <MdInfo className="w-4 h-4 text-slate-600" />
                </div>
                <span className="font-semibold text-slate-900">Quick Info</span>
              </div>
              <svg 
                className={`w-5 h-5 text-slate-400 transition-transform ${expandedSections.quickInfo ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.quickInfo && (
              <div className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-slate-500 text-xs font-medium mb-1">Created</div>
                    <div className="font-semibold text-slate-900 text-sm">{createdAt ? createdAt.toLocaleDateString() : "-"}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-slate-500 text-xs font-medium mb-1">Last Updated</div>
                    <div className="font-semibold text-slate-900 text-sm">{updatedAt ? updatedAt.toLocaleDateString() : "-"}</div>
                  </div>
                  {service.scheduledDate && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-blue-600 text-xs font-medium mb-1">Scheduled Date</div>
                      <div className="font-semibold text-blue-900 text-sm">{formatDate(service.scheduledDate)}</div>
                    </div>
                  )}
                  {service.completedDate && (
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-green-600 text-xs font-medium mb-1">Completed Date</div>
                      <div className="font-semibold text-green-900 text-sm">{formatDate(service.completedDate)}</div>
                    </div>
                  )}
                  {service.qualityScore && (
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="text-yellow-600 text-xs font-medium mb-1">Quality Score</div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">{renderStars(Math.round(service.qualityScore))}</div>
                        <span className="font-semibold text-yellow-900 text-sm">({service.qualityScore}/5)</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Notes and Work Notes */}
          {(service.notes || (service.workNotes && service.workNotes.length > 0)) && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <button 
                onClick={() => toggleSection('notes')}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <MdNotes className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="font-semibold text-slate-900">Notes & Work Notes</span>
                </div>
                <svg 
                  className={`w-5 h-5 text-slate-400 transition-transform ${expandedSections.notes ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.notes && (
                <div className="px-4 pb-4 space-y-3">
                  {service.notes && (
                    <div>
                      <div className="text-slate-500 text-xs font-medium mb-1">General Notes</div>
                      <div className="font-medium text-slate-900 bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm leading-relaxed">
                        {service.notes}
                      </div>
                    </div>
                  )}
                  {service.workNotes && service.workNotes.length > 0 && (
                    <div>
                      <div className="text-slate-500 text-xs font-medium mb-2">Work Notes</div>
                      <div className="space-y-2">
                        {service.workNotes.map((note, index) => (
                          <div key={`worknote-${index}-${note.substring(0, 10)}`} className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500">
                            <div className="font-medium text-slate-900 text-sm leading-relaxed">{note}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Parts Used */}
          {service.partsUsed && service.partsUsed.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <button 
                onClick={() => toggleSection('parts')}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <MdInventory className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="font-semibold text-slate-900">Parts Used</span>
                </div>
                <svg 
                  className={`w-5 h-5 text-slate-400 transition-transform ${expandedSections.parts ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.parts && (
                <div className="px-4 pb-4 space-y-2">
                  {service.partsUsed.map((part, index) => (
                    <div key={`part-${index}-${part.name}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">{part.name}</div>
                        <div className="text-xs text-slate-500">Quantity: {part.quantity}</div>
                      </div>
                      <div className="font-bold text-slate-900">₹{part.cost.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Customer Feedback */}
          {service.customerFeedback && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <button 
                onClick={() => toggleSection('feedback')}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <MdFeedback className="w-4 h-4 text-yellow-600" />
                  </div>
                  <span className="font-semibold text-slate-900">Customer Feedback</span>
                </div>
                <svg 
                  className={`w-5 h-5 text-slate-400 transition-transform ${expandedSections.feedback ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.feedback && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-600 font-medium text-sm">Rating:</span>
                    <div className="flex items-center gap-1">{renderStars(service.customerFeedback.rating)}</div>
                    <span className="text-sm font-semibold text-slate-900">({service.customerFeedback.rating}/5)</span>
                  </div>
                  {service.customerFeedback.comment && (
                    <div>
                      <div className="text-slate-500 text-xs font-medium mb-1">Comment</div>
                      <div className="font-medium text-slate-900 bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm leading-relaxed">
                        {service.customerFeedback.comment}
                      </div>
                    </div>
                  )}
                  <div className="text-xs text-slate-500 bg-slate-100 px-3 py-2 rounded-lg">
                    Date: {service.customerFeedback.date.toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status History */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <button 
              onClick={() => toggleSection('history')}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <MdHistory className="w-4 h-4 text-blue-600" />
                </div>
                <span className="font-semibold text-slate-900">Status History</span>
              </div>
              <svg 
                className={`w-5 h-5 text-slate-400 transition-transform ${expandedSections.history ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.history && (
              <div className="px-4 pb-4 space-y-2">
                {statusHistory.length > 0 ? (
                  statusHistory.map((entry, index) => (
                    <div key={`history-${entry.status}-${entry.timestamp.getTime()}-${index}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className={`${statusColors[entry.status]} px-2 py-1 rounded text-xs font-semibold border`}>
                          {entry.status}
                        </div>
                        <div className="flex items-center gap-1 text-slate-600">
                          <MdPerson className="w-3 h-3 text-slate-400" />
                          <span className="font-medium text-xs">{entry.updatedBy}</span>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                        {entry.timestamp.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <MdHistory className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm font-medium">No status history available</p>
                    <p className="text-slate-400 text-xs">Status changes will appear here</p>
                  </div>
                )}
              </div>
            )}
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
