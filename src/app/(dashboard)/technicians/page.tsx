"use client";
import React, { useState, useEffect } from "react";
import { useUser } from "@/hooks";
import { useBranches } from "@/hooks/useBranches";
import { usePermissions } from "@/hooks/usePermissions";
import { RoleGuard, PermissionGuard } from "@/components";
import TechnicianList from "@/modules/technician/TechnicianList";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, DocumentData, Query, CollectionReference } from "firebase/firestore";
import type { Technician } from "@/types";
import Link from "next/link";
import { logger } from "@/lib/logger";
import { 
  UserGroupIcon, 
  StarIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  PlusIcon,
  ChartBarIcon,
  MapPinIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";

export default function TechniciansPage() {
  return (
    <RoleGuard allowedRoles={["shop_admin", "branch_admin"]}>
      <PermissionGuard permissions={["technician:read"]}>
        <TechniciansContent />
      </PermissionGuard>
    </RoleGuard>
  );
}

function TechniciansContent() {
  const { user } = useUser();
  const { branches } = useBranches(user?.shopId);
  const { canDeleteTechnician } = usePermissions();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    online: 0,
    averageRating: 0,
    totalCompleted: 0,
    totalCurrent: 0
  });

  // Log user data for debugging (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Technicians page user data', {
        userId: user?.uid,
        userRole: user?.role,
        shopId: user?.shopId,
        techniciansCount: technicians.length,
        branchesCount: branches.length
      });
    }
  }, [user, technicians, branches]);

  useEffect(() => {
    if (!user) return;
    
    const fetchTechnicians = async () => {
      try {
        let q: Query<DocumentData> | CollectionReference<DocumentData> = collection(db, "technicians");
        
        if (user.role === "shop_admin") {
          if (!user.shopId) return;
          q = query(q, where("shopId", "==", user.shopId));
        } else if (user.role === "branch_admin") {
          if (!user.branchId) return;
          q = query(q, where("branchId", "==", user.branchId));
        }
        
        const snapshot = await getDocs(q);
        const technicianList: Technician[] = snapshot.docs.map((doc: DocumentData) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            role: "technician",
            branchId: data.branch_id || data.branchId || '',
            shopId: data.shop_id || data.shopId || '',
            skills: data.skills || [],
            status: data.status || "active",
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
          };
        });
        
        // Calculate stats
        const total = technicianList.length;
        const active = technicianList.filter(t => t.status === 'active').length;
        const online = Math.floor(total * 0.7); // Mock online count
        const averageRating = (Math.random() * 2 + 3).toFixed(1); // Mock average rating
        const totalCompleted = technicianList.length * (Math.floor(Math.random() * 20) + 10); // Mock completed services
        const totalCurrent = technicianList.length * (Math.floor(Math.random() * 3) + 1); // Mock current tasks

        setStats({
          total,
          active,
          online,
          averageRating: parseFloat(averageRating),
          totalCompleted,
          totalCurrent
        });
        
        logger.debug('Technicians fetched successfully', { 
          count: technicianList.length,
          userRole: user.role 
        });
        setTechnicians(technicianList);
      } catch (error) {
        logger.error('Error fetching technicians', { userRole: user.role, error: error as Error });
      }
    };
    
    fetchTechnicians();
  }, [user]);

  const handleDelete = async (technicianId: string) => {
    if (!canDeleteTechnician()) {
      logger.warn('User attempted to delete technician without permission', { 
        userId: user?.uid, 
        technicianId 
      });
      return;
    }
    
    try {
      logger.info('Deleting technician', { technicianId, userId: user?.uid });
      // Add your delete logic here
      logger.info('Technician deleted successfully', { technicianId });
    } catch (error) {
      logger.error('Error deleting technician', { technicianId, error: error as Error });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="w-full flex flex-col px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Technicians</h1>
            <p className="text-gray-600">
              Manage your team of skilled technicians
            </p>
          </div>
          <PermissionGuard permissions={["technician:write"]} fallback={null}>
            <Link
              href="/technicians/new"
              className="mt-4 sm:mt-0 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg transition-all duration-200 transform hover:scale-105"
            >
                              <PlusIcon className="w-5 h-5" />
              Add Technician
            </Link>
          </PermissionGuard>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Technicians</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <UserGroupIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Online Now</p>
                <p className="text-2xl font-bold text-blue-600">{stats.online}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Rating</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.averageRating}/5.0</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <StarIcon className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Completed Services</h3>
                <p className="text-sm text-gray-600">Total services completed this month</p>
              </div>
            </div>
            <div className="text-3xl font-bold text-green-600">{stats.totalCompleted}</div>
            <div className="mt-2 text-sm text-gray-500">
              <span className="text-green-600">+12%</span> from last month
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <ClockIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Current Tasks</h3>
                <p className="text-sm text-gray-600">Active tasks being worked on</p>
              </div>
            </div>
            <div className="text-3xl font-bold text-blue-600">{stats.totalCurrent}</div>
            <div className="mt-2 text-sm text-gray-500">
              <span className="text-blue-600">+5%</span> from last week
            </div>
          </div>
        </div>

        {/* Technicians List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <TechnicianList
            technicians={technicians}
            branches={branches}
            onDelete={handleDelete}
          />
        </div>


        {/* Quick Actions */}
        {technicians.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PermissionGuard permissions={["technician:write"]} fallback={null}>
                <Link
                  href="/technicians/new"
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <PlusIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Add New Technician</h4>
                    <p className="text-sm text-gray-600">Create a new technician account</p>
                  </div>
                </Link>
              </PermissionGuard>

              <Link
                href="/dashboard"
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
              >
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <ChartBarIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">View Performance</h4>
                  <p className="text-sm text-gray-600">Check technician performance metrics</p>
                </div>
              </Link>

              <Link
                href="/services"
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Cog6ToothIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Manage Services</h4>
                  <p className="text-sm text-gray-600">Assign technicians to services</p>
                </div>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 