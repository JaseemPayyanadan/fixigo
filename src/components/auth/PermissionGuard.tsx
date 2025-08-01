"use client"
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { hasPermission, hasAnyPermission, hasAllPermissions, canAccessResource, type PermissionContext, type ResourceAccess } from "@/lib/rbac";
import type { Permission } from "@/types";

interface PermissionGuardProps {
  children: React.ReactNode;
  permissions?: Permission[];
  requireAll?: boolean; // If true, user must have ALL permissions. If false, user must have ANY permission.
  resource?: ResourceAccess;
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export default function PermissionGuard({ 
  children, 
  permissions, 
  requireAll = false,
  resource,
  redirectTo = "/unauthorized",
  fallback
}: PermissionGuardProps) {
  const { user, loading } = useUser();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!loading && user && !isRedirecting) {
      let hasAccess = false;
      
      // If no permissions are required, allow access
      if (!permissions || permissions.length === 0) {
        hasAccess = true;
      } else if (resource) {
        // Check permissions with resource context
        const context: PermissionContext = { user, resource };
        hasAccess = requireAll 
          ? permissions.every(permission => hasPermission(user, permission))
          : permissions.some(permission => hasPermission(user, permission));
        
        // Additional resource access check
        if (hasAccess) {
          hasAccess = canAccessResource(context);
        }
      } else {
        // Check permissions without resource context
        hasAccess = requireAll 
          ? hasAllPermissions(user, permissions)
          : hasAnyPermission(user, permissions);
      }

      if (!hasAccess) {
        setIsRedirecting(true);
        router.push(redirectTo);
      }
    }
  }, [user, loading, permissions, requireAll, resource, redirectTo, router, isRedirecting]);

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

  // Check permissions
  let hasAccess = false;
  
  // If no permissions are required, allow access
  if (!permissions || permissions.length === 0) {
    hasAccess = true;
  } else if (resource) {
    const context: PermissionContext = { user, resource };
    hasAccess = requireAll 
      ? permissions.every(permission => hasPermission(user, permission))
      : permissions.some(permission => hasPermission(user, permission));
    
    // Additional resource access check
    if (hasAccess) {
      hasAccess = canAccessResource(context);
    }
  } else {
    hasAccess = requireAll 
      ? hasAllPermissions(user, permissions)
      : hasAnyPermission(user, permissions);
  }

  if (!hasAccess) {
    return fallback || null;
  }

  return <>{children}</>;
} 