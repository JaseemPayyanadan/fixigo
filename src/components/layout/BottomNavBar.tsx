"use client";
import { useState } from "react";

import { usePathname, useRouter } from "next/navigation";

import { Bars3Icon, BriefcaseIcon, BuildingOfficeIcon, HomeIcon, UserGroupIcon, UserIcon, XMarkIcon } from "@heroicons/react/24/outline";

import { useUser } from "@/hooks/useUser";

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
    icon: BriefcaseIcon,
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
];

export function BottomNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Filter navigation items based on user role
  const filteredNavItems = navItems.filter((item) => item.roles.includes(user?.role || ""));

  // Get active item
  const activeItem = filteredNavItems.find((item) => pathname.startsWith(item.href));

  const handleNavigation = (href: string) => {
    router.push(href);
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
      {/* Main Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 md:hidden shadow-lg">
        <div className="flex items-center justify-around h-16 px-2">
          {/* More Menu Button (if more than 4 items) */}
          {filteredNavItems.length > 4 && (
            <button onClick={toggleMenu} className={`flex flex-col items-center justify-center px-2 py-1 rounded-md transition-colors ${isMenuOpen ? "text-blue-600" : "text-slate-600 hover:text-blue-600"}`}>
              <Bars3Icon className="w-5 h-5 mb-0.5" />
              <span className="text-xs font-medium">More</span>
            </button>
          )}

          {/* Primary Navigation Items (max 4 items) */}
          {filteredNavItems.slice(0, 4).map((item) => {
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
                <div className={`p-1.5 rounded-lg transition-all duration-200 ${isActive ? "bg-blue-50" : "group-hover:bg-slate-50"}`}>
                  <Icon className={`w-5 h-5 ${isActive ? "text-blue-600" : "text-slate-600"}`} />
                </div>
                
                {/* Label */}
                <span className={`text-xs font-medium mt-1 ${isActive ? "text-blue-600" : "text-slate-600"}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Expanded Menu Overlay */}
      {isMenuOpen && filteredNavItems.length > 4 && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black bg-opacity-30" onClick={() => setIsMenuOpen(false)} />

          {/* Menu Panel */}
          <div className="absolute bottom-20 left-4 right-4 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900">More Options</h3>
                <button onClick={() => setIsMenuOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                {filteredNavItems.slice(4).map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <button 
                      key={item.href} 
                      onClick={() => handleNavigation(item.href)} 
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${isActive ? "bg-blue-50 text-blue-600 border border-blue-200" : "text-slate-700 hover:bg-slate-50"}`}
                    >
                      <div className={`p-1.5 rounded-lg ${isActive ? "bg-blue-100" : "bg-slate-100"}`}>
                        <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-600"}`} />
                      </div>
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
