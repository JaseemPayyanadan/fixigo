"use client";
import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { FixigoLogo } from "@/components/brand/FixigoLogo";
import { useUser } from "@/hooks/useUser";

export function HomeClient() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Check if user has completed onboarding
        if (user.role === "shop_admin" && !user.onboardingCompleted) {
          // Shop admin needs to complete onboarding
          router.push("/onboarding");
        } else {
          // User has completed onboarding or is branch admin, go to dashboard
          router.push("/dashboard");
        }
      } else {
        router.push("/login");
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <FixigoLogo variant="lockup" size={40} className="mb-4" />
        <div className="flex items-center gap-2 mb-2">
          <span className="sr-only" role="status">
            Checking your session…
          </span>
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" aria-label="Loading" />
        </div>
      </div>
    );
  }

  return null; // Don't render anything while redirecting
}
