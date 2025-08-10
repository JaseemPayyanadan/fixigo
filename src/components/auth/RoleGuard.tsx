"use client"
import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

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
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isRedirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
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