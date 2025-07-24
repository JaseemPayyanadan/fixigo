"use client";
import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { HiHome, HiBriefcase, HiOfficeBuilding, HiUserGroup, HiUser, HiClipboardList, HiMenu, HiX } from "react-icons/hi";
import { useUser } from "@/hooks/useUser";
// import { useSidebar } from "@/contexts/SidebarContext";

const navItems = [
  { 
    label: "Dashboard", 
    href: "/dashboard", 
    icon: HiHome,
    roles: ["shop_admin", "branch_admin", "technician"]
  },
  { 
    label: "Services", 
    href: "/services", 
    icon: HiBriefcase,
    roles: ["shop_admin", "branch_admin", "technician"]
  },
  { 
    label: "My Tasks", 
    href: "/my-tasks", 
    icon: HiClipboardList,
    roles: ["technician"]
  },
  { 
    label: "My Profile", 
    href: "/profile", 
    icon: HiUser,
    roles: ["technician"]
  },
  { 
    label: "Branches", 
    href: "/branch", 
    icon: HiOfficeBuilding,
    roles: ["shop_admin"]
  },
  { 
    label: "Technicians", 
    href: "/technicians", 
    icon: HiUserGroup,
    roles: ["shop_admin", "branch_admin"]
  },
];

export function BottomNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  // const { collapsed, setCollapsed } = useSidebar();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Filter navigation items based on user role
  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(user?.role || "")
  );

  // Get active item
  const activeItem = filteredNavItems.find(item => pathname.startsWith(item.href));

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
      <nav className="bottom-nav-fixed md:hidden">
        <div className="flex items-center justify-around h-16 px-2">
          {/* More Menu Button (if more than 4 items) - Now at the beginning */}
          {filteredNavItems.length > 4 && (
            <button
              onClick={toggleMenu}
              className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                isMenuOpen 
                  ? "text-blue-600 bg-blue-50" 
                  : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
              }`}
            >
              <div className="relative">
                {isMenuOpen ? (
                  <HiX className="text-xl mb-1 transition-transform duration-200 scale-110" />
                ) : (
                  <HiMenu className="text-xl mb-1 transition-transform duration-200" />
                )}
                {isMenuOpen && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                )}
              </div>
              <span className={`text-xs font-medium transition-colors duration-200 ${
                isMenuOpen ? "text-blue-600" : "text-gray-500"
              }`}>
                More
              </span>
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
                className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isActive 
                    ? "text-blue-600 bg-blue-50" 
                    : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                }`}
              >
                <div className={`relative ${isActive ? "animate-bounce" : ""}`}>
                  <Icon className={`text-xl mb-1 transition-transform duration-200 ${
                    isActive ? "scale-110" : "scale-100"
                  }`} />
                  {isActive && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  )}
                </div>
                <span className={`text-xs font-medium transition-colors duration-200 ${
                  isActive ? "text-blue-600" : "text-gray-500"
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Item Indicator */}
        {activeItem && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
        )}
      </nav>

      {/* Expanded Menu Overlay */}
      {isMenuOpen && filteredNavItems.length > 4 && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-200"
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="absolute bottom-20 left-4 right-4 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">More Options</h3>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <HiX className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-2">
                {filteredNavItems.slice(4).map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      onClick={() => handleNavigation(item.href)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isActive 
                          ? "bg-blue-50 text-blue-600 border border-blue-200" 
                          : "text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? "text-blue-600" : "text-gray-500"}`} />
                      <span className="font-medium">{item.label}</span>
                      {isActive && (
                        <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Safe Area Spacing for iOS and Android */}
      <div className="safe-area-bottom h-4 md:hidden"></div>
    </>
  );
} 