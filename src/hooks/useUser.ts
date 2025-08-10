"use client";
import { useState, useEffect, useRef } from "react";
import { AuthUser } from "@/lib/auth";

// Cache for user data to prevent unnecessary API calls
let userCache: { user: AuthUser | null; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useUser() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      // Check cache first
      if (userCache && Date.now() - userCache.timestamp < CACHE_DURATION) {
        setUser(userCache.user);
        setLoading(false);
        return;
      }

      // Cancel previous request if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch("/api/auth/me", {
          signal: abortControllerRef.current.signal
        });
        
        if (response.ok) {
          const data = await response.json();
          const userData = data.user;
          
          // Update cache
          userCache = {
            user: userData,
            timestamp: Date.now()
          };
          
          setUser(userData);
        } else {
          setUser(null);
          // Clear cache on error
          userCache = null;
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Request was aborted, don't update state
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to fetch user data");
        setUser(null);
        // Clear cache on error
        userCache = null;
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Cleanup function to abort request on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Function to clear cache (useful for logout)
  const clearCache = () => {
    userCache = null;
  };

  return { user, loading, error, clearCache };
} 