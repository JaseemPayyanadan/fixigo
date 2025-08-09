"use client";
import React, { useState, useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, updateDoc, doc, onSnapshot, getDocs } from "firebase/firestore";
import { HiClipboardList, HiClock, HiCheckCircle, HiXCircle, HiEye, HiUser, HiDeviceMobile, HiCurrencyDollar, HiCalendar } from "react-icons/hi";

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  status: string;
  customer?: { name: string; phone: string; email: string };
  device?: { type: string; brand: string; model: string; imei: string };
  createdAt: Date;
  updatedAt: Date;
  priority?: string;
  estimatedDuration?: string;
  notes?: string;
}

export default function MyTasksPage() {
  const { user } = useUser();
  const router = useRouter();
  const [tasks, setTasks] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    if (!user || user.role !== "technician") {
      router.push("/dashboard");
      return;
    }

    const fetchTasks = async () => {
      setLoading(true);
      try {
        // First, get the technician document to find the correct ID
        const technicianQuery = query(collection(db, "technicians"), where("created_by", "==", user.id));
        const technicianSnapshot = await getDocs(technicianQuery);
        const technicianDoc = technicianSnapshot.docs[0];
        
        if (technicianDoc) {
          const technicianId = technicianDoc.id;
          console.log('My Tasks - Found technician document ID:', technicianId);
          
          // Fetch services assigned to this technician
          const servicesQuery = query(
            collection(db, "services"),
            where("technician_id", "==", technicianId)
          );
          
          // Set up real-time listener for updates
          const unsubscribe = onSnapshot(servicesQuery, (snapshot) => {
            const services = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as Service[];
            
            setTasks(services);
            setLoading(false);
          });

          return () => unsubscribe();
        } else {
          console.log('My Tasks - No technician document found for UID:', user.id);
          setTasks([]);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching tasks:", error);
        setLoading(false);
      }
    };

    fetchTasks();
  }, [user, router]);

  const handleStatusUpdate = async (taskId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "services", taskId), {
        status: newStatus,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "To Do":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "In Progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "Cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "To Do":
        return <HiClock className="w-4 h-4" />;
      case "In Progress":
        return <HiClipboardList className="w-4 h-4" />;
      case "Completed":
        return <HiCheckCircle className="w-4 h-4" />;
      case "Cancelled":
        return <HiXCircle className="w-4 h-4" />;
      default:
        return <HiClipboardList className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800";
      case "Medium":
        return "bg-yellow-100 text-yellow-800";
      case "Low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredAndSortedTasks = tasks
    .filter(task => {
      // Filter by status
      if (filter !== "all" && task.status !== filter) return false;
      
      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          task.name.toLowerCase().includes(searchLower) ||
          task.description.toLowerCase().includes(searchLower) ||
          task.customer?.name.toLowerCase().includes(searchLower) ||
          task.device?.brand.toLowerCase().includes(searchLower) ||
          task.device?.model.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "createdAt":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "status":
          const statusOrder = { "To Do": 1, "In Progress": 2, "Completed": 3, "Cancelled": 4 };
          return (statusOrder[a.status as keyof typeof statusOrder] || 0) - (statusOrder[b.status as keyof typeof statusOrder] || 0);
        case "price":
          return b.price - a.price;
        default:
          return 0;
      }
    });

  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === "To Do").length,
    inProgress: tasks.filter(t => t.status === "In Progress").length,
    completed: tasks.filter(t => t.status === "Completed").length,
    cancelled: tasks.filter(t => t.status === "Cancelled").length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <HiClipboardList className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-q">My Tasks</h1>
              <p className="text-gray-600 text-sm">Manage your assigned service requests and track progress</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <HiClipboardList className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <HiClock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">To Do</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todo}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <HiClipboardList className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <HiCheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <HiXCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Cancelled</p>
                <p className="text-2xl font-bold text-gray-900">{stats.cancelled}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Tasks</option>
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="createdAt">Date Created</option>
                  <option value="status">Status</option>
                  <option value="price">Price</option>
                </select>
              </div>
            </div>
            
            <div className="flex-1 max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Tasks</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name, customer, or device..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <HiEye className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Task List ({filteredAndSortedTasks.length} tasks)
              </h3>
              <div className="text-sm text-gray-500">
                Showing {filteredAndSortedTasks.length} of {tasks.length} tasks
              </div>
            </div>
          </div>

          <div className="p-6">
            {filteredAndSortedTasks.length === 0 ? (
              <div className="text-center py-12">
                <HiClipboardList className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {filter === "all" && !searchTerm
                    ? "You don&apos;t have any assigned tasks yet." 
                    : searchTerm
                    ? `No tasks match "${searchTerm}"`
                    : `No tasks with status "${filter}" found.`
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAndSortedTasks.map((task) => (
                  <div key={task.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all duration-200 bg-white">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <h4 className="text-lg font-semibold text-gray-900">{task.name}</h4>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                              {getStatusIcon(task.status)}
                              {task.status}
                            </span>
                            {task.priority && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                {task.priority} Priority
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <select
                              value={task.status}
                              onChange={(e) => handleStatusUpdate(task.id, e.target.value)}
                              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="To Do">To Do</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </div>
                        </div>
                        
                        <p className="text-gray-600 mb-4">{task.description}</p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                          {task.customer && (
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <HiUser className="w-4 h-4 text-gray-500" />
                                <h5 className="text-sm font-medium text-gray-900">Customer</h5>
                              </div>
                              <p className="text-sm text-gray-600 font-medium">{task.customer.name}</p>
                              <p className="text-sm text-gray-500">{task.customer.phone}</p>
                              {task.customer.email && (
                                <p className="text-sm text-gray-500">{task.customer.email}</p>
                              )}
                            </div>
                          )}
                          
                          {task.device && (
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <HiDeviceMobile className="w-4 h-4 text-gray-500" />
                                <h5 className="text-sm font-medium text-gray-900">Device</h5>
                              </div>
                              <p className="text-sm text-gray-600 font-medium">{task.device.brand} {task.device.model}</p>
                              <p className="text-sm text-gray-500">{task.device.type}</p>
                              {task.device.imei && (
                                <p className="text-sm text-gray-500">IMEI: {task.device.imei}</p>
                              )}
                            </div>
                          )}
                          
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <HiCurrencyDollar className="w-4 h-4 text-gray-500" />
                              <h5 className="text-sm font-medium text-gray-900">Service Details</h5>
                            </div>
                            <p className="text-sm text-gray-600 font-medium">${task.price}</p>
                            {task.estimatedDuration && (
                              <p className="text-sm text-gray-500">Est. Duration: {task.estimatedDuration}</p>
                            )}
                          </div>
                        </div>
                        
                        {task.notes && (
                          <div className="bg-blue-50 rounded-lg p-3 mb-4">
                            <h5 className="text-sm font-medium text-blue-900 mb-1">Notes</h5>
                            <p className="text-sm text-blue-700">{task.notes}</p>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <HiCalendar className="w-4 h-4" />
                              <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                            </div>
                            {task.updatedAt && task.updatedAt !== task.createdAt && (
                              <div className="flex items-center gap-1">
                                <HiCalendar className="w-4 h-4" />
                                <span>Updated: {new Date(task.updatedAt).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/services/details?id=${task.id}`)}
                              className="flex items-center gap-1 px-4 py-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors border border-blue-200 rounded-lg hover:bg-blue-50"
                            >
                              <HiEye className="w-4 h-4" />
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 