"use client";
import React, { useState, useMemo, useCallback } from "react";
import { usePathname } from "next/navigation";
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
  Cog6ToothIcon
} from "@heroicons/react/24/outline";
import { useUser } from "@/hooks/useUser";
import { useSidebar } from "@/contexts/SidebarContext";
import { useNavigation } from "@/hooks/useNavigation";
import { PerformanceMonitor } from "@/components/PerformanceMonitor";

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
  { 
    label: "Settings", 
    href: "/settings", 
    icon: Cog6ToothIcon,
    description: "System settings",
    roles: ["shop_admin"]
  },
];

const SideNavBar = React.memo(function SideNavBar() {
  const pathname = usePathname();
  const { navigate } = useNavigation();
  const { user } = useUser();
  const { collapsed, setCollapsed } = useSidebar();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Memoize filtered navigation items based on user role
  const filteredNavItems = useMemo(() => {
    if (!user?.role) return [];
    return navItems.filter(item => item.roles.includes(user.role));
  }, [user]);

  // Memoize invoices visibility
  const showInvoices = useMemo(() => {
    return user && (user.role === "shop_admin" || user.role === "branch_admin");
  }, [user]);

  // Memoize event handlers
  const handleCollapseToggle = useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  const handleNavigation = useCallback((href: string) => {
    navigate(href);
  }, [navigate]);

  const handleMouseEnter = useCallback((href: string) => {
    setHoveredItem(href);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredItem(null);
  }, []);

  // Memoize navigation item rendering
  const renderNavItem = useCallback((item: typeof navItems[0]) => {
    const isActive = pathname.startsWith(item.href);
    const Icon = item.icon;
    
    return (
      <div key={item.href} className="relative">
        <button
          onClick={() => handleNavigation(item.href)}
          onMouseEnter={() => handleMouseEnter(item.href)}
          onMouseLeave={handleMouseLeave}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none group ${
            isActive 
              ? "bg-blue-50 text-blue-700 border-l-2 border-blue-600" 
              : "text-gray-600 hover:bg-gray-100 cursor-pointer hover:text-gray-900"
          }`}
        >
          <Icon className={`h-4 w-4 transition-colors duration-200 ${
            isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
          }`} />
          {!collapsed && <span>{item.label}</span>}
        </button>

        {/* Tooltip for collapsed state */}
        {collapsed && hoveredItem === item.href && (
          <div className="absolute left-full ml-2 px-2.5 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-50 whitespace-nowrap">
            <div className="font-medium">{item.label}</div>
            <div className="text-gray-300 text-xs">{item.description}</div>
          </div>
        )}
      </div>
    );
  }, [pathname, collapsed, hoveredItem, handleNavigation, handleMouseEnter, handleMouseLeave]);

  // Memoize invoices button rendering
  const renderInvoicesButton = useCallback(() => {
    if (!showInvoices) return null;
    
    const isActive = pathname.startsWith("/invoices");
    
    return (
      <div className="relative">
        <button
          onClick={() => handleNavigation("/invoices")}
          onMouseEnter={() => handleMouseEnter("/invoices")}
          onMouseLeave={handleMouseLeave}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 focus:outline-none group ${
            isActive
              ? "bg-blue-50 text-blue-700 border-l-2 border-blue-600"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <DocumentTextIcon className={`h-4 w-4 transition-colors duration-200 ${
            isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
          }`} />
          {!collapsed && <span>Invoices</span>}
        </button>

        {/* Tooltip for collapsed state */}
        {collapsed && hoveredItem === "/invoices" && (
          <div className="absolute left-full ml-2 px-2.5 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-50 whitespace-nowrap">
            <div className="font-medium">Invoices</div>
            <div className="text-gray-300 text-xs">Manage invoices and payments</div>
          </div>
        )}
      </div>
    );
  }, [showInvoices, pathname, collapsed, hoveredItem, handleNavigation, handleMouseEnter, handleMouseLeave]);

  return (
    <>
      <PerformanceMonitor enabled={process.env.NODE_ENV === 'development'} />
      <aside className={`hidden md:flex h-full flex-col fixed top-0 left-0 bg-white border-r border-gray-100 z-40 transition-all duration-200 ${
        collapsed ? "w-14" : "w-60"
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-gray-100">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <span className="text-lg font-bold text-gray-900 tracking-tight">Fixigo</span>
            </div>
          )}
          <button
            onClick={handleCollapseToggle}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-200"
          >
            {collapsed ? <ChevronRightIcon className="h-4 w-4" /> : <XMarkIcon className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation */}
        <div className="flex flex-col flex-1 py-3">
          <nav className="flex flex-col gap-0.5">
            {filteredNavItems.map(renderNavItem)}
            {renderInvoicesButton()}
          </nav>
        </div>
      </aside>
    </>
  );
});

export { SideNavBar }; 