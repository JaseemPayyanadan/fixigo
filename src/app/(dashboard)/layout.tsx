"use client";

import { usePathname } from "next/navigation";


import AuthGuard from "@/components/auth/AuthGuard";
import { AppBar } from "@/components/layout/AppBar";
import { BottomNavBar } from "@/components/layout/BottomNavBar";
import { SideNavBar } from "@/components/layout/SideNavBar";
import { PageFallback } from "@/components/ui/PageSkeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "@/contexts/SidebarContext";

const hideNavRoutes = ["/login", "/register", "/onboarding", "/services/invoice"];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { rail } = useSidebar();

  const hideNav = hideNavRoutes.some((route) => pathname === route || pathname.startsWith(route));

  if (loading) {
    return <PageFallback label="Loading" />;
  }

  if (!user) {
    return <AuthGuard>{null}</AuthGuard>;
  }

  return (
    <>
      {!hideNav && <SideNavBar />}
      {!hideNav && <AppBar />}
      <main className={`main-content transition-all duration-200 ${!hideNav ? `pt-14 ${rail ? "md:pl-14" : "md:pl-56"}` : ""}`}>{children}</main>
      {!hideNav && <BottomNavBar />}
    </>
  );
}
