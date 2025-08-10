"use client";
import React, { createContext, useContext } from "react";

import { useUser } from "@/hooks/useUser";
import { authUserToUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import type { User, Permission } from "@/types";

interface PermissionContext {
  user: User;
  resource?: string;
}

const PermissionContext = createContext<PermissionContext | null>(null);

interface PermissionGuardProps {
  children: React.ReactNode;
  permissions: Permission[];
  resource?: string;
  requireAll?: boolean;
  fallback?: React.ReactNode;
}

export default function PermissionGuard({ 
  children, 
  permissions, 
  resource = "default", 
  requireAll = true,
  fallback = null 
}: PermissionGuardProps) {
  const { user } = useUser();

  if (!user) {
    return fallback;
  }

  // Convert AuthUser to User type for compatibility
  const userForPermissions = authUserToUser(user);

  const context: PermissionContext = { user: userForPermissions, resource };

  const hasAccess = requireAll
    ? permissions.every(permission => hasPermission(userForPermissions, permission))
    : permissions.some(permission => hasPermission(userForPermissions, permission));

  if (!hasAccess) {
    return fallback;
  }

  return (
    <PermissionContext.Provider value={context}>
      {children}
    </PermissionContext.Provider>
  );
}

// Hook to use permission context
export function usePermissionContext() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermissionContext must be used within a PermissionGuard");
  }
  return context;
}

// Higher-order component for permission-based rendering
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permissions: Permission[],
  resource: string = "default",
  requireAll: boolean = true
) {
  return function PermissionWrappedComponent(props: P) {
    const { user } = useUser();

    if (!user) {
      return null;
    }

    // Convert AuthUser to User type for compatibility
    const userForPermissions = authUserToUser(user);

    const context: PermissionContext = { user: userForPermissions, resource };

    const hasAccess = requireAll
      ? permissions.every(permission => hasPermission(userForPermissions, permission))
      : permissions.some(permission => hasPermission(userForPermissions, permission));

    if (!hasAccess) {
      return null;
    }

    return (
      <PermissionContext.Provider value={context}>
        <WrappedComponent {...props} />
      </PermissionContext.Provider>
    );
  };
} 