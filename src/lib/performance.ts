/**
 * Performance optimization utilities for the Fixigo application
 */

// CSS Containment helpers for better rendering performance
export const cssContainment = {
  layout: "layout",
  style: "style",
  paint: "paint",
  size: "size",
  strict: "strict",
  content: "content",
} as const;

export type CSSContainment = (typeof cssContainment)[keyof typeof cssContainment];

// Debounce function for expensive operations
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number, immediate = false): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func(...args);
  };
}

// Throttle function for frequent events
export function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Request animation frame wrapper for smooth animations
export function rafThrottle<T extends (...args: any[]) => any>(func: T): (...args: Parameters<T>) => void {
  let ticking = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!ticking) {
      requestAnimationFrame(() => {
        func(...args);
        ticking = false;
      });
      ticking = true;
    }
  };
}

// Intersection Observer with performance optimizations
export function createIntersectionObserver(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}): IntersectionObserver | null {
  if (typeof IntersectionObserver === "undefined") {
    return null;
  }

  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: "0px",
    threshold: 0.1,
    ...options,
  };

  try {
    return new IntersectionObserver(callback, defaultOptions);
  } catch (error) {
    console.warn("IntersectionObserver creation failed:", error);
    return null;
  }
}

// Performance measurement utilities
export class PerformanceTimer {
  private startTime: number;
  private name: string;

  constructor(name: string) {
    this.name = name;
    this.startTime = performance.now();
  }

  end(): number {
    const duration = performance.now() - this.startTime;

    if (process.env.NODE_ENV === "development") {
      console.log(`⏱️ ${this.name}: ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  mark(label: string): void {
    if (typeof performance !== "undefined" && performance.mark) {
      performance.mark(`${this.name}-${label}`);
    }
  }

  measure(label: string): void {
    if (typeof performance !== "undefined" && performance.measure) {
      try {
        performance.measure(`${this.name}-${label}`, `${this.name}-start`, `${this.name}-${label}`);
      } catch (error) {
        // Measure already exists
      }
    }
  }
}

// Memory usage monitoring
export function getMemoryUsage(): PerformanceMemory | null {
  if (typeof performance !== "undefined" && "memory" in performance) {
    return (performance as any).memory;
  }
  return null;
}

// CPU usage estimation
export function estimateCPUUsage(callback: () => void, iterations = 1000): number {
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    callback();
  }

  const end = performance.now();
  return (end - start) / iterations;
}

// Lazy loading utility
export function createLazyLoader<T>(
  loader: () => Promise<T>,
  options: {
    threshold?: number;
    timeout?: number;
    retries?: number;
  } = {}
): () => Promise<T> {
  const { threshold = 100, timeout = 5000, retries = 3 } = options;
  let cached: T | null = null;
  let loading: Promise<T> | null = null;
  let retryCount = 0;

  return async (): Promise<T> => {
    if (cached) return cached;
    if (loading) return loading;

    loading = new Promise<T>(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Lazy loading timeout"));
      }, timeout);

      try {
        const result = await loader();
        clearTimeout(timeoutId);
        cached = result;
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);

        if (retryCount < retries) {
          retryCount++;
          loading = null;
          // Retry after exponential backoff
          setTimeout(() => {
            createLazyLoader(loader, options)();
          }, Math.pow(2, retryCount) * threshold);
        }

        reject(error);
      } finally {
        loading = null;
      }
    });

    return loading;
  };
}

// Web Vitals monitoring
export function monitorWebVitals(): void {
  if (typeof window === "undefined") return;

  // Monitor Largest Contentful Paint (LCP)
  if ("PerformanceObserver" in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];

        if (lastEntry) {
          const lcp = lastEntry.startTime;
          if (lcp > 2500) {
            console.warn(`🚨 Slow LCP detected: ${lcp.toFixed(2)}ms`);
          }
        }
      });

      lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });
    } catch (error) {
      console.warn("LCP monitoring not supported");
    }
  }

  // Monitor First Input Delay (FID)
  if ("PerformanceObserver" in window) {
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const fid = entry.processingStart - entry.startTime;
          if (fid > 100) {
            console.warn(`🚨 Slow FID detected: ${fid.toFixed(2)}ms`);
          }
        });
      });

      fidObserver.observe({ entryTypes: ["first-input"] });
    } catch (error) {
      console.warn("FID monitoring not supported");
    }
  }
}

// Export types
export interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}
