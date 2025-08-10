"use client";
import { useCallback, useEffect, useRef } from "react";

import { useRouter } from "next/navigation";

interface NavigationMetrics {
  navigationTime: number;
  preloadTime: number;
  renderTime: number;
  totalTime: number;
}

interface NavigationPerformanceOptions {
  enablePreloading?: boolean;
  enableMetrics?: boolean;
  preloadThreshold?: number;
  performanceThreshold?: number;
}

/**
 * Advanced navigation performance hook with preloading, metrics, and optimizations
 */
export function useNavigationPerformance(options: NavigationPerformanceOptions = {}) {
  const { enablePreloading = true, enableMetrics = process.env.NODE_ENV === "development", preloadThreshold = 100, performanceThreshold = 16 } = options;

  const router = useRouter();
  const navigationStartRef = useRef<number>(0);
  const preloadStartRef = useRef<number>(0);
  const renderStartRef = useRef<number>(0);
  const metricsRef = useRef<NavigationMetrics>({
    navigationTime: 0,
    preloadTime: 0,
    renderTime: 0,
    totalTime: 0,
  });

  // Preload critical routes for faster navigation
  const preloadRoute = useCallback(
    (href: string) => {
      if (!enablePreloading) return;

      const startTime = performance.now();
      preloadStartRef.current = startTime;

      try {
        router.prefetch(href);

        const preloadTime = performance.now() - startTime;
        metricsRef.current.preloadTime = preloadTime;

        if (enableMetrics && preloadTime > preloadThreshold) {
          console.warn(`⚠️ Slow preload detected: ${preloadTime.toFixed(2)}ms for ${href}`);
        }
      } catch (error) {
        if (enableMetrics) {
          console.error(`❌ Preload failed for ${href}:`, error);
        }
      }
    },
    [router, enablePreloading, enableMetrics, preloadThreshold]
  );

  // Enhanced navigation with performance tracking
  const navigate = useCallback(
    (href: string) => {
      const startTime = performance.now();
      navigationStartRef.current = startTime;

      // Start measuring render time
      renderStartRef.current = performance.now();

      try {
        router.push(href);

        const navigationTime = performance.now() - startTime;
        metricsRef.current.navigationTime = navigationTime;

        if (enableMetrics && navigationTime > performanceThreshold) {
          console.warn(`🚨 Slow navigation detected: ${navigationTime.toFixed(2)}ms to ${href}`);
        }
      } catch (error) {
        if (enableMetrics) {
          console.error(`❌ Navigation failed to ${href}:`, error);
        }
      }
    },
    [router, enableMetrics, performanceThreshold]
  );

  // Batch preload multiple routes
  const preloadRoutes = useCallback(
    (routes: string[]) => {
      if (!enablePreloading || routes.length === 0) return;

      const startTime = performance.now();

      // Use requestIdleCallback for non-critical preloading
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        (window as any).requestIdleCallback(() => {
          routes.forEach((route) => preloadRoute(route));

          const totalTime = performance.now() - startTime;
          if (enableMetrics) {
            console.log(`📦 Batch preloaded ${routes.length} routes in ${totalTime.toFixed(2)}ms`);
          }
        });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => {
          routes.forEach((route) => preloadRoute(route));
        }, 0);
      }
    },
    [enablePreloading, preloadRoute, enableMetrics]
  );

  // Get current performance metrics
  const getMetrics = useCallback((): NavigationMetrics => {
    return { ...metricsRef.current };
  }, []);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    metricsRef.current = {
      navigationTime: 0,
      preloadTime: 0,
      renderTime: 0,
      totalTime: 0,
    };
  }, []);

  // Monitor render performance
  useEffect(() => {
    if (!enableMetrics) return;

    const handleRouteChangeComplete = () => {
      if (renderStartRef.current > 0) {
        const renderTime = performance.now() - renderStartRef.current;
        metricsRef.current.renderTime = renderTime;

        if (renderTime > performanceThreshold) {
          console.warn(`🚨 Slow render detected: ${renderTime.toFixed(2)}ms`);
        }

        // Calculate total time
        metricsRef.current.totalTime = metricsRef.current.navigationTime + metricsRef.current.preloadTime + renderTime;

        if (enableMetrics) {
          console.log(`📊 Navigation Performance:`, {
            navigation: `${metricsRef.current.navigationTime.toFixed(2)}ms`,
            preload: `${metricsRef.current.preloadTime.toFixed(2)}ms`,
            render: `${renderTime.toFixed(2)}ms`,
            total: `${metricsRef.current.totalTime.toFixed(2)}ms`,
          });
        }
      }
    };

    // Listen for route change completion
    window.addEventListener("load", handleRouteChangeComplete);

    return () => {
      window.removeEventListener("load", handleRouteChangeComplete);
    };
  }, [enableMetrics, performanceThreshold]);

  return {
    navigate,
    preloadRoute,
    preloadRoutes,
    getMetrics,
    resetMetrics,
    router,
  };
}
