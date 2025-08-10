"use client";
import { useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * Optimized navigation hook that provides memoized navigation functions
 * to prevent unnecessary re-renders and improve performance
 */
export function useNavigation() {
  const router = useRouter();

  const navigate = useCallback((href: string) => {
    router.push(href);
  }, [router]);

  const navigateReplace = useCallback((href: string) => {
    router.replace(href);
  }, [router]);

  const navigateBack = useCallback(() => {
    router.back();
  }, [router]);

  const navigateForward = useCallback(() => {
    router.forward();
  }, [router]);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  return {
    navigate,
    navigateReplace,
    navigateBack,
    navigateForward,
    refresh,
    router
  };
}
