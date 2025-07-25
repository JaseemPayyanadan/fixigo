"use client";
import React, { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useUser } from "../../../hooks";
import { useBranches } from "../../../hooks/useBranches";
import { RoleGuard, PermissionGuard } from "../../../components";
import ServiceList from "../../../modules/service/ServiceList";
import { SearchFilter } from "../../../components/ui";
import { HiPlus, HiClock, HiCheckCircle, HiCurrencyRupee, HiDeviceMobile } from "react-icons/hi";
import Link from "next/link";

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
  device?: {
    type: string;
    brand: string;
    model: string;
    serial: string;
  };
  customer?: {
    name: string;
    phone?: string;
    email?: string;
  };
}

const STATUS_OPTIONS = ["All", "To Do", "In Progress", "Awaiting Parts", "On Hold", "Ready for Pickup", "Completed", "Cancelled", "Pending"];

export default function ServicesPage() {
  return (
    <RoleGuard allowedRoles={["shop_admin", "branch_admin", "technician"]}>
      <PermissionGuard permissions={["service:read"]}>
        <ServicesContent />
      </PermissionGuard>
    </RoleGuard>
  );
}

function ServicesContent() {
  const { user } = useUser();
  const { branches } = useBranches(user?.shopId);

  
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Fetch services
  useEffect(() => {
    const fetchServices = async () => {
      if (!user?.shopId) return;
      
      try {
        setLoading(true);
        const servicesRef = collection(db, "services");
        const q = query(
          servicesRef,
          where("shopId", "==", user.shopId),
          orderBy("createdAt", "desc")
        );
        
        const querySnapshot = await getDocs(q);
        const servicesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        })) as Service[];
        
        setServices(servicesData);
      } catch (error) {
        console.error("Error fetching services:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [user?.shopId]);

  // Filtered services
  const filteredServices = useMemo(() => {
    return services.filter(service => {
      const matchesSearch = !search || 
        service.name?.toLowerCase().includes(search.toLowerCase()) ||
        service.description?.toLowerCase().includes(search.toLowerCase()) ||
        service.device?.model?.toLowerCase().includes(search.toLowerCase()) ||
        service.device?.brand?.toLowerCase().includes(search.toLowerCase()) ||
        service.customer?.name?.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter === "All" || service.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [services, search, statusFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = services.length;
    const completed = services.filter(s => s.status === "Completed").length;
    const inProgress = services.filter(s => s.status === "In Progress").length;
    const pending = services.filter(s => s.status === "Pending" || s.status === "To Do").length;
    const totalRevenue = services
      .filter(s => s.status === "Completed")
      .reduce((sum, s) => sum + (s.price || 0), 0);

    return {
      total,
      completed,
      inProgress,
      pending,
      totalRevenue
    };
  }, [services]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-gray-600 mt-1">Manage and track your service requests</p>
        </div>
        <PermissionGuard permissions={["service:write"]} fallback={null}>
          <Link
            href="/services/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <HiPlus className="w-4 h-4" />
            New Service
          </Link>
        </PermissionGuard>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Services</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <HiDeviceMobile className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <HiCheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <HiClock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <HiClock className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revenue</p>
              <p className="text-2xl font-bold text-green-600">₹{stats.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <HiCurrencyRupee className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <SearchFilter
        search={search}
        onSearchChange={setSearch}
        placeholder="Search services by customer, device, or service name..."
        filters={[
          {
            key: "status",
            label: "Status",
            value: statusFilter,
            options: STATUS_OPTIONS.map(status => ({ value: status, label: status })),
            onChange: setStatusFilter
          }
        ]}
        onClear={clearFilters}
        showClear={true}
        className="mb-6"
      />

      {/* Services List */}
      <ServiceList
        services={filteredServices}
        branches={branches}
        loading={loading}
        search={search}
      />
    </div>
  );
} 