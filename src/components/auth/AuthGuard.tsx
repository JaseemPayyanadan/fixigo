"use client"
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
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
        if (user.role === "shop_admin" && (!user.shopId || !user.onboardingCompleted) && pathname !== "/shop-onboarding") {
          setIsRedirecting(true);
          router.push("/shop-onboarding");
        } else if (pathname !== "/dashboard") {
          setIsRedirecting(true);
          router.push("/dashboard");
        }
      } else if (requireAuth && user) {
        // For authenticated users, only redirect if they need onboarding and are not already on the onboarding page
        if (user.role === "shop_admin" && (!user.shopId || !user.onboardingCompleted) && pathname !== "/shop-onboarding") {
          setIsRedirecting(true);
          router.push("/shop-onboarding");
        }
      }
    }
  }, [user, loading, requireAuth, redirectTo, router, pathname, isRedirecting]);

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

  if (requireAuth && !user) {
    return null; // Don't render anything while redirecting
  }

  if (!requireAuth && user) {
    return null; // Don't render anything while redirecting
  }

  // Don't render if shop_admin needs onboarding, unless we're on the onboarding page
  if (requireAuth && user && user.role === "shop_admin" && (!user.shopId || !user.onboardingCompleted) && pathname !== "/shop-onboarding") {
    return null;
  }

  return <>{children}</>;
} 