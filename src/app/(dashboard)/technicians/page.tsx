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
import logger from "@/lib/logger";

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
        
        logger.debug('Technicians fetched successfully', { 
          count: technicianList.length,
          userRole: user.role 
        });
        setTechnicians(technicianList);
      } catch (error) {
        logger.error('Error fetching technicians', error as Error, { userRole: user.role });
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
      logger.error('Error deleting technician', error as Error, { technicianId });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="w-full px-4 py-8">
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
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Technician
            </Link>
          </PermissionGuard>
        </div>

        {/* Technicians List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <TechnicianList
            technicians={technicians}
            branches={branches}
            onDelete={handleDelete}
          />
        </div>

        {/* Empty State */}
        {technicians.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No technicians found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding your first technician to your team.
            </p>
            <PermissionGuard permissions={["technician:write"]} fallback={null}>
              <div className="mt-6">
                <Link
                  href="/technicians/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Your First Technician
                </Link>
              </div>
            </PermissionGuard>
          </div>
        )}
      </div>
    </div>
  );
} 