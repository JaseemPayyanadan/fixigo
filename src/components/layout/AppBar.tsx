"use client";
import { useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { ArrowRightOnRectangleIcon, ShieldCheckIcon, UserIcon } from "@heroicons/react/24/outline";
import { CalendarDays, Menu, Search } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { useUser } from "@/hooks/useUser";

import NotificationBell from "../NotificationBell";

function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function AppBar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [query, setQuery] = useState("");

  const userIconRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { user, loading } = useUser();
  const { logout } = useAuth();
  const router = useRouter();
  const { collapsed, rail, setCollapsed } = useSidebar();

  // Rendered on the client only: formatting a date during SSR and again on the
  // client produces a hydration mismatch whenever the two disagree on timezone.
  const [today, setToday] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("Welcome back");
  useEffect(() => {
    const now = new Date();
    setToday(now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }));
    setGreeting(greetingFor(now.getHours()));
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && userIconRef.current && !userIconRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  // ⌘K / Ctrl-K focuses search, matching the shortcut advertised in the field.
  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "U";
  const firstName = user?.name?.trim().split(/\s+/)[0] || "there";

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed) router.push(`/services?q=${encodeURIComponent(trimmed)}`);
  };

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
    <header className={`fixed left-0 right-0 top-0 z-[9999] flex h-[72px] items-center gap-3 border-b border-gray-100 bg-white px-3 transition-all duration-200 md:gap-4 md:px-6 ${rail ? "md:ml-14" : "md:ml-56"}`}>
      {/* Sidebar toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 lg:flex"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile brand. Takes the free space the greeting holds from `md` up, so
          the bell and user avatar sit against the right edge on a phone. */}
      <div className="flex flex-1 items-center gap-2 md:hidden">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
          <span className="text-sm font-bold text-white">F</span>
        </div>
        <span className="text-lg font-bold tracking-tight text-gray-900">Fixigo</span>
      </div>

      {/* Greeting */}
      <div className="hidden min-w-0 flex-1 md:block">
        <p className="truncate text-sm font-bold leading-tight tracking-tight text-gray-900">
          {greeting}, {firstName}!
        </p>
        <p className="truncate text-xs leading-tight text-gray-500">
          Here&apos;s what&apos;s happening in your shop today.
        </p>
      </div>

      {/* Date */}
      <div className="hidden shrink-0 items-center gap-2 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-semibold text-gray-700 xl:flex">
        <CalendarDays className="h-4 w-4 text-gray-400" aria-hidden="true" />
        <span className="whitespace-nowrap">{today ?? " "}</span>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} role="search" className="relative hidden shrink-0 lg:block">
        <label htmlFor="appbar-search" className="sr-only">
          Search by device, customer or invoice
        </label>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          id="appbar-search"
          ref={searchRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by device, customer or invoice..."
          className="w-64 rounded-xl border border-gray-200 py-2.5 pl-10 pr-14 text-sm transition-colors placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 xl:w-80"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
          ⌘K
        </kbd>
      </form>

      {/* Notifications */}
      <NotificationBell className="shrink-0" />

      {/* User */}
      <div className="relative shrink-0">
        <div ref={userIconRef} className="flex cursor-pointer items-center gap-2 rounded-md p-1.5 transition-colors duration-200 hover:bg-gray-100 md:gap-2.5" onClick={() => setDropdownOpen((open) => !open)} tabIndex={0} aria-haspopup="true" aria-expanded={dropdownOpen}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-sm">{loading ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-b-2 border-white"></div> : userInitial}</div>
        </div>

        {dropdownOpen && (
          <div ref={dropdownRef} className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-gray-100 bg-white py-2 shadow-lg duration-200 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white shadow">{userInitial}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold text-gray-900">{user?.name || "User"}</div>
                <div className="truncate text-sm text-gray-500">{user?.email || "-"}</div>
                <div className="mt-1 flex items-center gap-1">
                  <ShieldCheckIcon className="h-3 w-3 text-blue-600" />
                  <span className="text-xs font-medium text-blue-600">{getUserRoleDisplay()}</span>
                </div>
              </div>
            </div>

            <div className="py-1">
              <button
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors duration-200 hover:bg-blue-50 hover:text-blue-700"
                onClick={() => {
                  setDropdownOpen(false);
                  router.push("/profile");
                }}
              >
                <UserIcon className="h-4 w-4" />
                <span>Profile</span>
              </button>
            </div>

            <div className="my-1 border-t border-gray-100"></div>

            <button className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors duration-200 hover:bg-red-50 hover:text-red-700" onClick={handleSignOut}>
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
