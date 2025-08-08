"use client";
import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { 
  HomeIcon, 
  BriefcaseIcon, 
  BuildingOfficeIcon, 
  UserGroupIcon, 
  DocumentTextIcon, 
  XMarkIcon, 
  ChevronRightIcon, 
  ClipboardDocumentListIcon, 
  UserIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  DocumentChartBarIcon,
  CurrencyDollarIcon
} from "@heroicons/react/24/outline";
import { useUser } from "@/hooks/useUser";
import { useSidebar } from "@/contexts/SidebarContext";

const navItems = [
  { 
    label: "Dashboard", 
    href: "/dashboard", 
    icon: HomeIcon,
    description: "Overview and analytics",
    roles: ["shop_admin", "branch_admin", "technician"]
  },
  { 
    label: "Services", 
    href: "/services", 
    icon: BriefcaseIcon,
    description: "Manage service requests",
    roles: ["shop_admin", "branch_admin", "technician"]
  },
  { 
    label: "My Tasks", 
    href: "/my-tasks", 
    icon: ClipboardDocumentListIcon,
    description: "View assigned tasks",
    roles: ["technician"]
  },
  { 
    label: "My Profile", 
    href: "/profile", 
    icon: UserIcon,
    description: "Manage your profile",
    roles: ["technician"]
  },
  { 
    label: "Branches", 
    href: "/branch", 
    icon: BuildingOfficeIcon,
    description: "Manage business locations",
    roles: ["shop_admin"]
  },
  { 
    label: "Technicians", 
    href: "/technicians", 
    icon: UserGroupIcon,
    description: "Manage technical staff",
    roles: ["shop_admin", "branch_admin"]
  },
  // { 
  //   label: "Reports", 
  //   href: "/reports", 
  //   icon: DocumentChartBarIcon,
  //   description: "View business reports",
  //   roles: ["shop_admin"]
  // },
  // { 
  //   label: "Analytics", 
  //   href: "/analytics", 
  //   icon: ChartBarIcon,
  //   description: "Business analytics",
  //   roles: ["shop_admin"]
  // },
  { 
    label: "Settings", 
    href: "/settings", 
    icon: Cog6ToothIcon,
    description: "System settings",
    roles: ["shop_admin"]
  },
];

export function SideNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { collapsed, setCollapsed } = useSidebar();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // const isShopAdmin = user?.role === "shop_admin";
  // const isBranchAdmin = user?.role === "branch_admin";
  const isTechnician = user?.role === "technician";

  return (
    <aside className={`hidden md:flex  h-full flex-col fixed top-0 left-0 bg-white border-r border-gray-200 z-40 transition-all duration-300 ${
      collapsed ? "w-16" : "w-64"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-6 border-b border-gray-100">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">Fixigo</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        >
          {collapsed ? <ChevronRightIcon className="h-5 w-5" /> : <XMarkIcon className="h-5 w-5" />}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex flex-col flex-1 py-6">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            // Skip items not accessible to current user role
            if (!item.roles.includes(user?.role || "")) return null;
            
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            
            return (
              <div key={item.href} className="relative">
                <button
                  onClick={() => router.push(item.href)}
                  onMouseEnter={() => setHoveredItem(item.href)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`w-full flex items-center gap-3 px-3 py-3 text-base font-medium transition-all duration-200 focus:outline-none group ${
                    isActive 
                      ? "bg-blue-50 text-blue-700 border-l-2 border-blue-600" 
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon className={`h-5 w-5 transition-colors duration-200 ${
                    isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                  }`} />
                  {!collapsed && <span>{item.label}</span>}
                </button>

                {/* Tooltip for collapsed state */}
                {collapsed && hoveredItem === item.href && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-50 whitespace-nowrap">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-gray-300 text-xs">{item.description}</div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Invoices menu for shop_admin and branch_admin */}
          {user && (user.role === "shop_admin" || user.role === "branch_admin") && (
            <div className="relative">
              <button
                onClick={() => router.push("/invoices")}
                onMouseEnter={() => setHoveredItem("/invoices")}
                onMouseLeave={() => setHoveredItem(null)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-all duration-200 focus:outline-none group ${
                  pathname.startsWith("/invoices")
                    ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <DocumentTextIcon className={`h-5 w-5 transition-colors duration-200 ${
                  pathname.startsWith("/invoices") ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                }`} />
                {!collapsed && <span>Invoices</span>}
              </button>

              {/* Tooltip for collapsed state */}
              {collapsed && hoveredItem === "/invoices" && (
                <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-50 whitespace-nowrap">
                  <div className="font-medium">Invoices</div>
                  <div className="text-gray-300 text-xs">Manage invoices and payments</div>
                </div>
              )}
            </div>
          )}


        </nav>

      </div>
    </aside>
  );
} 