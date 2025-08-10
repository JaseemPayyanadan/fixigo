"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { usePathname } from "next/navigation";

import { BriefcaseIcon, BuildingOfficeIcon, ChevronRightIcon, ClipboardDocumentListIcon, Cog6ToothIcon, DocumentTextIcon, HomeIcon, UserGroupIcon, UserIcon, XMarkIcon } from "@heroicons/react/24/outline";

import { PerformanceMonitor } from "@/components/PerformanceMonitor";
import { useSidebar } from "@/contexts/SidebarContext";
import { useNavigation } from "@/hooks/useNavigation";
import { useUser } from "@/hooks/useUser";


// Enhanced navigation items with preloading hints
const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: HomeIcon,
    description: "Overview and analytics",
    roles: ["shop_admin", "branch_admin", "technician"],
    preload: true, // High priority for preloading
    prefetch: true,
  },
  {
    label: "Services",
    href: "/services",
    icon: BriefcaseIcon,
    description: "Manage service requests",
    roles: ["shop_admin", "branch_admin", "technician"],
    preload: true,
    prefetch: true,
  },
  {
    label: "My Tasks",
    href: "/my-tasks",
    icon: ClipboardDocumentListIcon,
    description: "View assigned tasks",
    roles: ["technician"],
    preload: false,
    prefetch: true,
  },
  {
    label: "My Profile",
    href: "/profile",
    icon: UserIcon,
    description: "Manage your profile",
    roles: ["technician"],
    preload: false,
    prefetch: false,
  },
  {
    label: "Branches",
    href: "/branch",
    icon: BuildingOfficeIcon,
    description: "Manage business locations",
    roles: ["shop_admin"],
    preload: false,
    prefetch: true,
  },
  {
    label: "Technicians",
    href: "/technicians",
    icon: UserGroupIcon,
    description: "Manage technical staff",
    roles: ["shop_admin", "branch_admin"],
    preload: false,
    prefetch: true,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Cog6ToothIcon,
    description: "System settings",
    roles: ["shop_admin"],
    preload: false,
    prefetch: false,
  },
];

// Performance-optimized navigation item component
const NavItem = React.memo(({
  item,
  isActive,
  collapsed,
  hoveredItem,
  onNavigate,
  onMouseEnter,
  onMouseLeave,
}: {
  item: (typeof navItems)[0];
  isActive: boolean;
  collapsed: boolean;
  hoveredItem: string | null;
  onNavigate: (href: string) => void;
  onMouseEnter: (href: string) => void;
  onMouseLeave: () => void;
}) => {
  const Icon = item.icon;

  return (
    <div className="relative" style={{ contain: "layout style paint" }}>
      <button
        onClick={() => onNavigate(item.href)}
        onMouseEnter={() => onMouseEnter(item.href)}
        onMouseLeave={onMouseLeave}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none group ${isActive ? "bg-blue-50 text-blue-700 border-l-2 border-blue-600" : "text-gray-600 hover:bg-gray-100 cursor-pointer hover:text-gray-900"}`}
        style={{ contain: "layout style" }}
      >
        <Icon className={`h-4 w-4 transition-colors duration-200 ${isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"}`} />
        {!collapsed && <span>{item.label}</span>}
      </button>

      {/* Optimized tooltip with intersection observer */}
      {collapsed && hoveredItem === item.href && (
        <div className="absolute left-full ml-2 px-2.5 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-50 whitespace-nowrap" style={{ contain: "layout style paint" }}>
          <div className="font-medium">{item.label}</div>
          <div className="text-gray-300 text-xs">{item.description}</div>
        </div>
      )}
    </div>
  );
});

NavItem.displayName = "NavItem";

const SideNavBar = React.memo(() => {
  const pathname = usePathname();
  const { navigate, router } = useNavigation();
  const { user } = useUser();
  const { collapsed, setCollapsed } = useSidebar();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Refs for performance optimizations
  const navContainerRef = useRef<HTMLDivElement>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);

  // Memoize filtered navigation items based on user role
  const filteredNavItems = useMemo(() => {
    if (!user?.role) return [];
    return navItems.filter((item) => item.roles.includes(user.role));
  }, [user]);

  // Enhanced memoization with more granular dependencies
  const memoizedPathname = useMemo(() => pathname, [pathname]);
  const memoizedCollapsed = useMemo(() => collapsed, [collapsed]);
  const memoizedHoveredItem = useMemo(() => hoveredItem, [hoveredItem]);

  // Preload critical navigation items
  useEffect(() => {
    if (!user?.role) return;

    const criticalItems = filteredNavItems.filter((item) => item.preload);

    criticalItems.forEach((item) => {
      // Prefetch critical routes
      if (item.prefetch) {
        router.prefetch(item.href);
      }
    });
  }, [user?.role, filteredNavItems, router]);

  // Intersection Observer for lazy loading off-screen items
  useEffect(() => {
    if (!navContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const href = entry.target.getAttribute("data-href");
            if (href) {
              // Prefetch when item comes into view
              router.prefetch(href);
            }
          }
        });
      },
      {
        root: navContainerRef.current,
        rootMargin: "50px",
        threshold: 0.1,
      }
    );

    intersectionObserverRef.current = observer;

    // Observe all navigation items
    const navItems = navContainerRef.current.querySelectorAll("[data-href]");
    navItems.forEach((item) => observer.observe(item));

    return () => {
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect();
      }
    };
  }, [router, filteredNavItems]);

  // Memoize event handlers with stable references
  const handleCollapseToggle = useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  const handleNavigation = useCallback(
    (href: string) => {
      navigate(href);
    },
    [navigate]
  );

  const handleMouseEnter = useCallback((href: string) => {
    setHoveredItem(href);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredItem(null);
  }, []);

  // Memoize navigation item rendering with optimized dependencies
  const renderNavItem = useCallback(
    (item: (typeof navItems)[0]) => {
      const isActive = memoizedPathname.startsWith(item.href);

      return (
        <div key={item.href} data-href={item.href}>
          <NavItem item={item} isActive={isActive} collapsed={memoizedCollapsed} hoveredItem={memoizedHoveredItem} onNavigate={handleNavigation} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} />
        </div>
      );
    },
    [memoizedPathname, memoizedCollapsed, memoizedHoveredItem, handleNavigation, handleMouseEnter, handleMouseLeave]
  );

  // Memoize header rendering
  const renderHeader = useCallback(
    () => (
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-100">
        {!memoizedCollapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="text-lg font-bold text-gray-900 tracking-tight">Fixigo</span>
          </div>
        )}
        <button onClick={handleCollapseToggle} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-200" style={{ contain: "layout style" }}>
          {memoizedCollapsed ? <ChevronRightIcon className="h-4 w-4" /> : <XMarkIcon className="h-4 w-4" />}
        </button>
      </div>
    ),
    [memoizedCollapsed, handleCollapseToggle]
  );

  return (
    <>
      <PerformanceMonitor enabled={process.env.NODE_ENV === "development"} />
      <aside className={`hidden md:flex h-full flex-col fixed top-0 left-0 bg-white border-r border-gray-100 z-40 transition-all duration-200 ${memoizedCollapsed ? "w-14" : "w-60"}`} style={{ contain: "layout style" }}>
        {/* Header */}
        {renderHeader()}

        {/* Navigation with intersection observer */}
        <div ref={navContainerRef} className="flex flex-col flex-1 py-3" style={{ contain: "layout style" }}>
          <nav className="flex flex-col gap-0.5">
            {filteredNavItems.map(renderNavItem)}
          </nav>
        </div>
      </aside>
    </>
  );
});

SideNavBar.displayName = "SideNavBar";

export { SideNavBar };
