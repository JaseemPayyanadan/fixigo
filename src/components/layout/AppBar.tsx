"use client";
import React, { useState, useRef, useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { HiBell, HiSearch, HiCog, HiLogout, HiUser, HiShieldCheck } from "react-icons/hi";
import { useSidebar } from "@/contexts/SidebarContext";

export function AppBar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications] = useState(3); // Mock notifications count
  const userIconRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const { user, loading } = useUser();
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
      await signOut(auth);
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
      default:
        return "User";
    }
  };

  return (
    <header className={`h-16 flex items-center justify-between px-4 md:px-8 bg-white border-b border-gray-200 fixed top-0 left-0 z-[9999] right-0 transition-all duration-300 ${
      collapsed ? "md:ml-16" : "md:ml-64"
    }`}>
      {/* Left Section - Brand */}
      <div className="flex md:hidden items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">F</span>
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">Fixigo</span>
        </div>
      </div>

      {/* Center Section - Search */}
      <div className="hidden md:flex flex-1 max-w-md">
        <div className="relative w-full" ref={searchRef}>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <HiSearch className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search services, customers, or invoices..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 bg-gray-50 hover:bg-white"
          />
        </div>
      </div>

      {/* Mobile Search Toggle */}
      <div className="md:hidden">
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        >
          <HiSearch className="h-6 w-6" />
        </button>
      </div>

      {/* Right Section - Actions & User */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Notifications */}
        <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200 hidden md:flex">
          <HiBell className="h-6 w-6" />
          {notifications > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
              {notifications}
            </span>
          )}
        </button>

        {/* User Profile */}
        <div className="relative">
          <div
            ref={userIconRef}
            className="flex items-center gap-2 md:gap-3 p-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors duration-200"
            onClick={() => setDropdownOpen((open) => !open)}
            tabIndex={0}
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                userInitial
              )}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-sm font-medium text-gray-900 truncate max-w-24">
                {user?.name || "User"}
              </div>
              {/* <div className="text-xs text-gray-500 truncate max-w-24">
                {getUserRoleDisplay()}
              </div> */}
            </div>
          </div>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div
              ref={dropdownRef}
              className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 py-2 animate-in fade-in-0 zoom-in-95 duration-200"
            >
              {/* User Info Header */}
              <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow">
                  {userInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-gray-900 font-semibold text-lg truncate">
                    {user?.name || "User"}
                  </div>
                  <div className="text-gray-500 text-sm truncate">
                    {user?.email || "-"}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <HiShieldCheck className="h-3 w-3 text-blue-600" />
                    <span className="text-xs text-blue-600 font-medium">
                      {getUserRoleDisplay()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                <button
                  className="w-full flex items-center gap-3 px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-200 font-medium"
                  onClick={() => {
                    setDropdownOpen(false);
                    // TODO: Navigate to profile
                  }}
                >
                  <HiUser className="h-5 w-5" />
                  <span>Profile</span>
                </button>
                
                <button
                  className="w-full flex items-center gap-3 px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-200 font-medium"
                  onClick={() => {
                    setDropdownOpen(false);
                    // TODO: Navigate to settings
                  }}
                >
                  <HiCog className="h-5 w-5" />
                  <span>Settings</span>
                </button>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100 my-2"></div>

              {/* Sign Out */}
              <button
                className="w-full flex items-center gap-3 px-6 py-3 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors duration-200 font-medium"
                onClick={handleSignOut}
              >
                <HiLogout className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {searchOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-200 p-4 shadow-lg">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <HiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>
        </div>
      )}
    </header>
  );
}