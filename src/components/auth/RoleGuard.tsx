"use client"
import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { PageFallback } from "@/components/ui/PageSkeleton";
import { useUser } from "@/hooks/useUser";
import type { Role } from "@/types";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: Role[];
  redirectTo?: string;
  fallback?: React.ReactNode;
  requireAll?: boolean; // If true, user must have ALL roles. If false, user must have ANY role.
}

export default function RoleGuard({ 
  children, 
  allowedRoles, 
  redirectTo = "/unauthorized",
  fallback,
  requireAll = false
}: RoleGuardProps) {
  const { user, loading } = useUser();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!loading && user && !isRedirecting) {
      const hasAccess = requireAll 
        ? allowedRoles.every(role => user.role === role)
        : allowedRoles.includes(user.role);

      if (!hasAccess) {
        setIsRedirecting(true);
        router.push(redirectTo);
      }
    }
  }, [user, loading, allowedRoles, redirectTo, router, isRedirecting, requireAll]);

  if (loading) {
    return <PageFallback label="Loading" />;
  }

  if (isRedirecting) {
    return <PageFallback label="Redirecting" />;
  }

  if (!user) {
    return fallback || null;
  }

  const hasAccess = requireAll 
    ? allowedRoles.every(role => user.role === role)
    : allowedRoles.includes(user.role);

  if (!hasAccess) {
    return fallback || null;
  }

  return <>{children}</>;
} 