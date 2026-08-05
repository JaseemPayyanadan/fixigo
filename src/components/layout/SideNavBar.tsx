"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { usePathname } from "next/navigation";

import {
  BarChart3,
  Briefcase,
  Building2,
  Check,
  ChevronDown,
  Home,
  MapPin,
  Settings,
  ShoppingCart,
  User,
  Wrench,
} from "lucide-react";

import { PerformanceMonitor } from "@/components/PerformanceMonitor";
import { useSidebar } from "@/contexts/SidebarContext";
import { useBranches } from "@/hooks/useBranches";
import { useNavigation } from "@/hooks/useNavigation";
import { useUser } from "@/hooks/useUser";
import type { Branch } from "@/types";

/**
 * Only routes that exist. Add a row when its page ships — a dead nav item
 * is worse than an absent one.
 */
const navItems: Array<{
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  roles: string[];
  prefetch?: boolean;
}> = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: Home,
    description: "Overview and analytics",
    roles: ["shop_admin", "branch_admin", "technician"],
    prefetch: true,
  },
  {
    label: "Repairs",
    href: "/services",
    icon: Wrench,
    description: "Manage repair jobs",
    roles: ["shop_admin", "branch_admin", "technician"],
    prefetch: true,
  },
  {
    label: "Technicians",
    href: "/technicians",
    icon: User,
    description: "Manage technical staff",
    roles: ["shop_admin", "branch_admin"],
    prefetch: true,
  },
  {
    label: "Spare Purchases",
    href: "/purchases",
    icon: ShoppingCart,
    description: "Suppliers, purchases and dues",
    roles: ["shop_admin", "branch_admin"],
    prefetch: true,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    description: "Business reporting",
    roles: ["shop_admin", "branch_admin"],
  },
  {
    label: "Branches",
    href: "/branch",
    icon: MapPin,
    description: "Manage business locations",
    roles: ["shop_admin"],
    prefetch: true,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    description: "System settings",
    roles: ["shop_admin"],
  },
];

const ROLE_LABELS: Record<string, string> = {
  shop_admin: "Owner",
  branch_admin: "Branch Admin",
  technician: "Technician",
};

const NavItem = React.memo(function NavItem({
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
  onMouseEnter: (key: string) => void;
  onMouseLeave: () => void;
}) {
  const Icon = item.icon;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onNavigate(item.href)}
        onMouseEnter={() => onMouseEnter(item.label)}
        onMouseLeave={onMouseLeave}
        aria-current={isActive ? "page" : undefined}
        title={collapsed ? item.label : undefined}
        className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-semibold transition-colors duration-200 motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
          isActive ? "bg-blue-600 text-white shadow-sm" : "text-gray-700 hover:bg-gray-100"
        } ${collapsed ? "justify-center px-0" : ""}`}
      >
        <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-white" : "text-gray-500"}`} aria-hidden="true" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </button>

      {collapsed && hoveredItem === item.label && (
        <div
          role="tooltip"
          className="absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-2 text-sm text-white shadow-lg"
        >
          <div className="font-medium">{item.label}</div>
          <div className="text-xs text-gray-300">{item.description}</div>
        </div>
      )}
    </div>
  );
});

function BranchSwitcher({
  branches,
  currentLabel,
  canSwitch,
  onSelectBranch,
  onManageAll,
}: {
  branches: Branch[];
  currentLabel: string;
  canSwitch: boolean;
  onSelectBranch: (branchId: string) => void;
  onManageAll: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!canSwitch) {
    return (
      <div className="flex cursor-default items-center gap-2.5 rounded-xl bg-gray-50 px-3 py-2.5">
        <Building2 className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Branch</p>
          <p className="truncate text-sm font-medium text-gray-700">{currentLabel}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select branch"
        className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 motion-reduce:transition-none"
      >
        <Building2 className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Branch</p>
          <p className="truncate text-sm font-medium text-gray-700">{currentLabel}</p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Branches"
          className="absolute bottom-full left-0 z-50 mb-2 max-h-56 w-full overflow-y-auto rounded-xl border border-gray-100 bg-white py-1 shadow-lg"
        >
          <li role="option">
            <button
              type="button"
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
              onClick={() => {
                setOpen(false);
                onManageAll();
              }}
            >
              <span className="min-w-0 flex-1 truncate">All branches</span>
            </button>
          </li>
          {branches.map((branch) => (
            <li key={branch.id} role="option" aria-selected={branch.name === currentLabel}>
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                onClick={() => {
                  setOpen(false);
                  onSelectBranch(branch.id);
                }}
              >
                <span className="min-w-0 flex-1 truncate font-medium">{branch.name}</span>
                {branch.name === currentLabel && <Check className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />}
              </button>
            </li>
          ))}
          {branches.length === 0 && (
            <li className="px-3 py-2.5 text-sm text-gray-400">No branches yet</li>
          )}
        </ul>
      )}
    </div>
  );
}

const SideNavBar = React.memo(() => {
  const pathname = usePathname();
  const { navigate, router } = useNavigation();
  const { user } = useUser();
  const { branches } = useBranches(user?.shopId);
  const { collapsed } = useSidebar();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const filteredNavItems = useMemo(() => {
    if (!user?.role) return [];
    return navItems.filter((item) => item.roles.includes(user.role));
  }, [user]);

  React.useEffect(() => {
    filteredNavItems.filter((item) => item.prefetch).forEach((item) => router.prefetch(item.href));
  }, [filteredNavItems, router]);

  const handleNavigation = useCallback((href: string) => navigate(href), [navigate]);
  const handleMouseEnter = useCallback((key: string) => setHoveredItem(key), []);
  const handleMouseLeave = useCallback(() => setHoveredItem(null), []);

  const initial = user?.name?.trim().charAt(0).toUpperCase() || "U";
  const canSwitchBranch = user?.role === "shop_admin";

  const currentBranchLabel =
    branches.find((branch) => branch.id === user?.branchId)?.name ??
    (user?.role === "shop_admin" ? "All Branches" : "Main Branch");

  return (
    <>
      <PerformanceMonitor enabled={process.env.NODE_ENV === "development"} />
      <aside
        className={`fixed left-0 top-0 z-40 hidden h-full flex-col border-r border-gray-100 bg-white transition-all duration-200 motion-reduce:transition-none md:flex ${
          collapsed ? "w-14" : "w-56"
        }`}
      >
        <div
          className={`flex h-[72px] shrink-0 items-center gap-2.5 border-b border-gray-100 px-4 ${
            collapsed ? "justify-center px-0" : ""
          }`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-sm" aria-hidden="true">
            <Briefcase className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-lg font-bold leading-tight tracking-tight text-gray-900">Fixigo</p>
              <p className="truncate text-[11px] leading-tight text-gray-400">Repair Management</p>
            </div>
          )}
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3" aria-label="Main">
          {filteredNavItems.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
              collapsed={collapsed}
              hoveredItem={hoveredItem}
              onNavigate={handleNavigation}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            />
          ))}
        </nav>

        {!collapsed && (
          <div className="space-y-2 border-t border-gray-100 px-3 py-3">
            <BranchSwitcher
              branches={branches}
              currentLabel={currentBranchLabel}
              canSwitch={canSwitchBranch}
              onManageAll={() => handleNavigation("/branch")}
              onSelectBranch={(branchId) => handleNavigation(`/branch/edit?id=${encodeURIComponent(branchId)}`)}
            />

            <button
              type="button"
              onClick={() => handleNavigation("/profile")}
              className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors duration-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 motion-reduce:transition-none"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white"
                aria-hidden="true"
              >
                {initial}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-gray-900">{user?.name || "Account"}</span>
                <span className="block truncate text-xs text-gray-400">
                  {user?.role ? ROLE_LABELS[user.role] ?? user.role : ""}
                </span>
              </span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
});

SideNavBar.displayName = "SideNavBar";

export { SideNavBar };
