"use client";

import { usePathname, useRouter } from "next/navigation";

import {
  BuildingOfficeIcon,
  Cog8ToothIcon,
  HomeIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: HomeIcon,
    roles: ["shop_admin", "branch_admin", "technician"],
  },
  {
    label: "Services",
    href: "/services",
    icon: Cog8ToothIcon,
    roles: ["shop_admin", "branch_admin", "technician"],
  },

  {
    label: "My Profile",
    href: "/profile",
    icon: UserIcon,
    roles: ["technician"],
  },
  {
    label: "Branches",
    href: "/branch",
    icon: BuildingOfficeIcon,
    roles: ["shop_admin"],
  },
  {
    label: "Technicians",
    href: "/technicians",
    icon: UserGroupIcon,
    roles: ["shop_admin", "branch_admin"],
  },
  {
    label: "Spare Purchases",
    href: "/purchases",
    icon: ShoppingCartIcon,
    roles: ["shop_admin", "branch_admin"],
  },
];

export function BottomNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  // Filter navigation items based on user role
  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(user?.role || ""),
  );

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 md:hidden shadow-lg">
      <div className="flex items-center justify-around h-16 px-2">
        {filteredNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <button
              key={item.href}
              onClick={() => handleNavigation(item.href)}
              className={`flex flex-col items-center justify-center px-2 py-1 rounded-md transition-all duration-200 relative group ${isActive ? "text-blue-600" : "text-slate-600 hover:text-blue-600"}`}
            >
              {/* Active State Underline */}
              {isActive && (
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full" />
              )}

              {/* Icon with enhanced active state */}
              <div
                className={`p-1.5 rounded-lg transition-all duration-200 ${isActive ? "bg-blue-50" : "group-hover:bg-slate-50"}`}
              >
                <Icon
                  className={`w-5 h-5 ${isActive ? "text-blue-600" : "text-slate-600"}`}
                />
              </div>

              {/* Label */}
              <span
                className={`text-xs font-medium mt-1 ${isActive ? "text-blue-600" : "text-slate-600"}`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
