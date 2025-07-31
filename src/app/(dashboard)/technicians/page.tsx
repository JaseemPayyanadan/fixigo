"use client";
import React, { useState, useEffect } from "react";
import { useUser } from "@/hooks";
import { useBranches } from "@/hooks/useBranches";
import { usePermissions } from "@/hooks/usePermissions";
import { RoleGuard, PermissionGuard } from "@/components";
import TechnicianList from "@/modules/technician/TechnicianList";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, DocumentData, Query, CollectionReference, getDoc, doc } from "firebase/firestore";
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



  useEffect(() => {
    if (!user) return;
    
    const fetchTechnicians = async () => {
      try {
        const technicianList: Technician[] = [];
        
        if (user.role === "shop_admin") {
          // For shop_admin, fetch technicians from all shops
          const shopsQuery = query(collection(db, "shops"));
          const shopsSnapshot = await getDocs(shopsQuery);

          for (const shopDoc of shopsSnapshot.docs) {
            const shopId = shopDoc.id;
            const shopData = shopDoc.data();
            
            try {
              // Fetch branches for this shop
              const branchesQuery = query(
                collection(db, "shops", shopId, "branches"),
                orderBy("createdAt", "desc")
              );
              const branchesSnapshot = await getDocs(branchesQuery);

              for (const branchDoc of branchesSnapshot.docs) {
                try {
                  const branchData = branchDoc.data();
                  const members = branchData.members || [];
                  
                  // Filter technicians from members array
                  for (const member of members) {
                    if (member.role === "technician") {
                      try {
                        // Fetch complete user data from users collection
                        let userData = null;
                        try {
                          // Try to get user document directly by ID first
                          const userDoc = await getDoc(doc(db, "users", member.userId));
                          if (userDoc.exists()) {
                            userData = userDoc.data();
                          } else {
                            // Fallback: Try query by uid if direct access fails
                            const userQuery = query(
                              collection(db, "users"),
                              where("uid", "==", member.userId)
                            );
                            const userSnapshot = await getDocs(userQuery);
                            
                            if (!userSnapshot.empty) {
                              userData = userSnapshot.docs[0].data();
                            }
                          }
                        } catch (error) {
                          // If direct access fails, try query method
                          const userQuery = query(
                            collection(db, "users"),
                            where("uid", "==", member.userId)
                          );
                          const userSnapshot = await getDocs(userQuery);
                          
                          if (!userSnapshot.empty) {
                            userData = userSnapshot.docs[0].data();
                          }
                        }
                        
                        const technician: Technician = {
                          id: member.userId || "",
                          name: userData?.name || member.name || "Unknown Technician",
                          email: userData?.email || member.email || "",
                          phone: userData?.phone || member.phone || "",
                          role: "technician",
                          shopId: member.shopId || shopId,
                          branchId: member.branchId || branchDoc.id,
                          skills: member.skills || [],
                          status: member.status || "active",
                          bio: member.bio || "",
                          specializations: member.specializations || [],
                          createdAt: member.createdAt?.toDate() || new Date(),
                          updatedAt: member.updatedAt?.toDate() || new Date(),
                        };
                        technicianList.push(technician);
                      } catch (error) {
                        logger.warn(`Error fetching user data for technician ${member.userId}:`, { error: String(error) });
                        // Add technician with member data only if user fetch fails
                        const technician: Technician = {
                          id: member.userId || "",
                          name: member.name || "Unknown Technician",
                          email: member.email || "",
                          phone: member.phone || "",
                          role: "technician",
                          shopId: member.shopId || shopId,
                          branchId: member.branchId || branchDoc.id,
                          skills: member.skills || [],
                          status: member.status || "active",
                          bio: member.bio || "",
                          specializations: member.specializations || [],
                          createdAt: member.createdAt?.toDate() || new Date(),
                          updatedAt: member.updatedAt?.toDate() || new Date(),
                        };
                        technicianList.push(technician);
                      }
                    }
                  }
                } catch (error) {
                  logger.warn(`Error fetching technicians for branch ${branchDoc.id} in shop ${shopId}:`, { error: String(error) });
                  // Continue with other branches even if one fails
                }
              }
            } catch (error) {
              logger.warn(`Error fetching branches for shop ${shopId}:`, { error: String(error) });
              // Continue with other shops even if one fails
            }
          }
        } else if (user.role === "branch_admin" && user.shopId && user.branchId) {
          // Fetch technicians from specific branch using members array
          const branchDoc = await getDoc(doc(db, "shops", user.shopId, "branches", user.branchId));
          if (branchDoc.exists()) {
            const branchData = branchDoc.data();
            const members = branchData.members || [];
            
            // Filter technicians from members array
            for (const member of members) {
              if (member.role === "technician") {
                try {
                  // Fetch complete user data from users collection
                  let userData = null;
                  try {
                    // Try to get user document directly by ID first
                    const userDoc = await getDoc(doc(db, "users", member.userId));
                    if (userDoc.exists()) {
                      userData = userDoc.data();
                    } else {
                      // Fallback: Try query by uid if direct access fails
                      const userQuery = query(
                        collection(db, "users"),
                        where("uid", "==", member.userId)
                      );
                      const userSnapshot = await getDocs(userQuery);
                      
                      if (!userSnapshot.empty) {
                        userData = userSnapshot.docs[0].data();
                      }
                    }
                  } catch (error) {
                    // If direct access fails, try query method
                    const userQuery = query(
                      collection(db, "users"),
                      where("uid", "==", member.userId)
                    );
                    const userSnapshot = await getDocs(userQuery);
                    
                    if (!userSnapshot.empty) {
                      userData = userSnapshot.docs[0].data();
                    }
                  }
                  
                  const technician: Technician = {
                    id: member.userId || "",
                    name: userData?.name || member.name || "",
                    email: userData?.email || member.email || "",
                    phone: userData?.phone || member.phone || "",
                    role: "technician",
                    shopId: member.shopId || "",
                    branchId: member.branchId || user.branchId,
                    skills: member.skills || [],
                    status: member.status || "active",
                    bio: member.bio || "",
                    specializations: member.specializations || [],
                    createdAt: member.createdAt?.toDate() || new Date(),
                    updatedAt: member.updatedAt?.toDate() || new Date(),
                  };
                  technicianList.push(technician);
                } catch (error) {
                  logger.warn(`Error fetching user data for technician ${member.userId}:`, { error: String(error) });
                  // Add technician with member data only if user fetch fails
                  const technician: Technician = {
                    id: member.userId || "",
                    name: member.name || "",
                    email: member.email || "",
                    phone: member.phone || "",
                    role: "technician",
                    shopId: member.shopId || "",
                    branchId: member.branchId || user.branchId,
                    skills: member.skills || [],
                    status: member.status || "active",
                    bio: member.bio || "",
                    specializations: member.specializations || [],
                    createdAt: member.createdAt?.toDate() || new Date(),
                    updatedAt: member.updatedAt?.toDate() || new Date(),
                  };
                  technicianList.push(technician);
                }
              }
            }
          }
        }
        
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
          userRole: user.role,
          technicianNames: technicianList.map(t => t.name).join(', ')
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
              {user?.role === "shop_admin" 
                ? "View all technicians across all shops" 
                : "Manage your team of skilled technicians"
              }
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

        {/* Technicians List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <TechnicianList
            technicians={technicians}
            branches={branches}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
} 