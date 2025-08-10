"use client";
import { useEffect, useRef } from "react";

interface PerformanceMonitorProps {
  enabled?: boolean;
  threshold?: number;
}

/**
 * Performance monitoring component for tracking navigation and rendering performance
 * Only renders in development mode or when explicitly enabled
 */
export function PerformanceMonitor({ enabled = false, threshold = 16 }: PerformanceMonitorProps) {
  const navigationStartRef = useRef<number>(0);
  const renderStartRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled && process.env.NODE_ENV !== 'development') return;

    // Monitor navigation performance
    const handleRouteChangeStart = () => {
      navigationStartRef.current = performance.now();
    };

    const handleRouteChangeComplete = () => {
      const navigationTime = performance.now() - navigationStartRef.current;
      if (navigationTime > threshold) {
        console.warn(`🚨 Slow navigation detected: ${navigationTime.toFixed(2)}ms`);
      } else {
        console.log(`✅ Navigation completed: ${navigationTime.toFixed(2)}ms`);
      }
    };

    // Monitor render performance
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'measure') {
          const duration = entry.duration;
          if (duration > threshold) {
            console.warn(`🚨 Slow render detected: ${duration.toFixed(2)}ms - ${entry.name}`);
          }
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['measure'] });
    } catch {
      // PerformanceObserver not supported in all environments
      console.warn('PerformanceObserver not supported');
    }

    // Add navigation event listeners
    window.addEventListener('beforeunload', handleRouteChangeStart);
    window.addEventListener('load', handleRouteChangeComplete);

    return () => {
      observer.disconnect();
      window.removeEventListener('beforeunload', handleRouteChangeStart);
      window.removeEventListener('load', handleRouteChangeComplete);
    };
  }, [enabled, threshold]);

  // Monitor component render time
  useEffect(() => {
    if (!enabled && process.env.NODE_ENV !== 'development') return;

    renderStartRef.current = performance.now();
    
    return () => {
      const renderTime = performance.now() - renderStartRef.current;
      if (renderTime > threshold) {
        console.warn(`🚨 Slow component render: ${renderTime.toFixed(2)}ms - SideNavBar`);
      }
    };
  }, [enabled, threshold]);

  // Don't render anything in production unless explicitly enabled
  if (!enabled && process.env.NODE_ENV === 'production') {
    return null;
  }

  return null; // This component doesn't render any UI
}
