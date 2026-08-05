"use client"
import { useEffect, useState } from "react";

import { useRouter, usePathname } from "next/navigation";

import { PageFallback } from "@/components/ui/PageSkeleton";
import { useUser } from "@/hooks";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export default function AuthGuard({ 
  children, 
  requireAuth = true, 
  redirectTo = "/login" 
}: AuthGuardProps) {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!loading && !isRedirecting) {
      if (requireAuth && !user) {
        setIsRedirecting(true);
        router.push(redirectTo);
      } else if (!requireAuth && user) {
        // If user is authenticated and we don't require auth (e.g., login page)
        // Check if shop_admin needs to complete onboarding
        if (user.role === "shop_admin" && !user.onboardingCompleted && pathname !== "/onboarding") {
          setIsRedirecting(true);
          router.push("/onboarding");
        } else if (pathname !== "/dashboard") {
          setIsRedirecting(true);
          router.push("/dashboard");
        }
      } else if (requireAuth && user) {
        // For authenticated users, check if they need onboarding
        if (user.role === "shop_admin" && !user.onboardingCompleted && pathname !== "/onboarding") {
          setIsRedirecting(true);
          router.push("/onboarding");
        }
      }
    }
  }, [user, loading, requireAuth, redirectTo, router, pathname, isRedirecting]);

  if (loading) {
    return <PageFallback label="Loading" />;
  }

  if (isRedirecting) {
    return <PageFallback label="Redirecting" />;
  }

  if (requireAuth && !user) {
    return null; // Don't render anything while redirecting
  }

  if (!requireAuth && user) {
    return null; // Don't render anything while redirecting
  }

  // Don't render if shop_admin needs onboarding, unless we're on the onboarding page
  if (requireAuth && user && user.role === "shop_admin" && !user.onboardingCompleted && pathname !== "/onboarding") {
    return null;
  }

  return <>{children}</>;
} 