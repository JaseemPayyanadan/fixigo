"use client";
import { useRef } from 'react';

/**
 * Custom hook for memoized callbacks with dependency tracking
 * This helps prevent unnecessary re-renders in dashboard components
 */
export function useMemoizedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: React.DependencyList
): T {
  const ref = useRef<{
    deps: React.DependencyList;
    callback: T;
    memoizedCallback: T;
  } | null>(null);

  if (!ref.current || !depsAreEqual(ref.current.deps, deps)) {
    ref.current = {
      deps,
      callback,
      memoizedCallback: callback
    };
  }

  return ref.current.memoizedCallback;
}

/**
 * Custom hook for expensive calculations with caching
 */
export function useMemoizedValue<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  const ref = useRef<{
    deps: React.DependencyList;
    value: T;
  } | null>(null);

  if (!ref.current || !depsAreEqual(ref.current.deps, deps)) {
    ref.current = {
      deps,
      value: factory()
    };
  }

  return ref.current.value;
}

/**
 * Helper function to compare dependency arrays
 */
function depsAreEqual(deps1: React.DependencyList, deps2: React.DependencyList): boolean {
  if (deps1.length !== deps2.length) return false;
  
  for (let i = 0; i < deps1.length; i++) {
    if (deps1[i] !== deps2[i]) return false;
  }
  
  return true;
}
