"use client";

import { usePathname } from "next/navigation";


import AuthGuard from "@/components/auth/AuthGuard";
import { AppBar } from "@/components/layout/AppBar";
import { BottomNavBar } from "@/components/layout/BottomNavBar";
import { SideNavBar } from "@/components/layout/SideNavBar";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "@/contexts/SidebarContext";

const hideNavRoutes = ["/login", "/register", "/onboarding", "/services/details"];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { collapsed } = useSidebar();

  const hideNav = hideNavRoutes.some((route) => pathname === route || pathname.startsWith(route));

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <AuthGuard>{null}</AuthGuard>;
  }

  return (
    <>
      {!hideNav && <SideNavBar />}
      {!hideNav && <AppBar />}
      <main className={`main-content transition-all duration-200 ${!hideNav ? `pt-14 md:pb-14 ${collapsed ? "md:pl-14" : "md:pl-60"}` : ""}`}>{children}</main>
      {!hideNav && <BottomNavBar />}
    </>
  );
}
