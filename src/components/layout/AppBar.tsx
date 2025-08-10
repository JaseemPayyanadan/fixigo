"use client";
import React, { useState, useRef, useEffect } from "react";

import { useRouter } from "next/navigation";

import { MagnifyingGlassIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon, UserIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";

import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { useUser } from "@/hooks/useUser";

import NotificationBell from "../NotificationBell";

export function AppBar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const userIconRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const { user, loading } = useUser();
  const { logout } = useAuth();
  const router = useRouter();
  const { collapsed } = useSidebar();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        userIconRef.current &&
        !userIconRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
      if (
        searchOpen &&
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen, searchOpen]);

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  const handleSignOut = async () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      await logout();
      setDropdownOpen(false);
      router.push("/login");
    }
  };

  const getUserRoleDisplay = () => {
    if (!user) return "";
    switch (user.role) {
      case "shop_admin":
        return "Shop Administrator";
      case "branch_admin":
        return "Branch Administrator";
      case "technician":
        return "Technician";
      default:
        return "User";
    }
  };

  return (
    <header className={`h-14 flex items-center justify-between px-3 md:px-6 bg-white border-b border-gray-100 fixed top-0 left-0 z-[9999] right-0 transition-all duration-200 ${
      collapsed ? "md:ml-14" : "md:ml-60"
    }`}>
      {/* Left Section - Brand */}
      <div className="flex md:hidden items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">F</span>
          </div>
          <span className="text-lg font-bold text-gray-900 tracking-tight">Fixigo</span>
        </div>
      </div>

      {/* Center Section - Search */}
      <div className="hidden md:flex flex-1 max-w-md">
        <div className="relative w-full" ref={searchRef}>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search services, customers, or invoices..."
            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 bg-gray-50 hover:bg-white text-sm"
          />
        </div>
      </div>

      {/* Mobile Search Toggle */}
      <div className="md:hidden">
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200"
        >
          <MagnifyingGlassIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Right Section - Actions & User */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Notifications */}
        <NotificationBell className="hidden md:flex" />

        {/* User Profile */}
        <div className="relative">
          <div
            ref={userIconRef}
            className="flex items-center gap-2 md:gap-2.5 p-1.5 rounded-md hover:bg-gray-100 cursor-pointer transition-colors duration-200"
            onClick={() => setDropdownOpen((open) => !open)}
            tabIndex={0}
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {loading ? (
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
              ) : (
                userInitial
              )}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-sm font-medium text-gray-900 truncate max-w-24">
                {user?.name || "User"}
              </div>
            </div>
          </div>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div
              ref={dropdownRef}
              className="absolute right-0 mt-2 w-64 bg-white border border-gray-100 rounded-lg shadow-lg z-50 py-2 animate-in fade-in-0 zoom-in-95 duration-200"
            >
              {/* User Info Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold shadow">
                  {userInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-gray-900 font-semibold text-base truncate">
                    {user?.name || "User"}
                  </div>
                  <div className="text-gray-500 text-sm truncate">
                    {user?.email || "-"}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <ShieldCheckIcon className="h-3 w-3 text-blue-600" />
                    <span className="text-xs text-blue-600 font-medium">
                      {getUserRoleDisplay()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                <button
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-200 font-medium text-sm"
                  onClick={() => {
                    setDropdownOpen(false);
                    // TODO: Navigate to profile
                  }}
                >
                  <UserIcon className="h-4 w-4" />
                  <span>Profile</span>
                </button>
                
                <button
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-200 font-medium text-sm"
                  onClick={() => {
                    setDropdownOpen(false);
                    // TODO: Navigate to settings
                  }}
                >
                  <Cog6ToothIcon className="h-4 w-4" />
                  <span>Settings</span>
                </button>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100 my-1"></div>

              {/* Sign Out */}
              <button
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors duration-200 font-medium text-sm"
                onClick={handleSignOut}
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {searchOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 p-3 shadow-lg">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>
        </div>
      )}
    </header>
  );
}