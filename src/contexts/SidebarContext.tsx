"use client";
import React, { createContext, useCallback, useContext, useState, useSyncExternalStore } from "react";

interface SidebarContextType {
  collapsed: boolean;
  /** Icon rail: user-collapsed, or tablet (below `lg`) where the full nav is too wide. */
  rail: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const LG_QUERY = "(min-width: 1024px)";

function subscribeLg(onChange: () => void): () => void {
  const media = window.matchMedia(LG_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getLgSnapshot(): boolean {
  return window.matchMedia(LG_QUERY).matches;
}

/** Desktop-first: SSR and the first paint assume the wide nav. */
function getLgServerSnapshot(): boolean {
  return true;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false);
  const isLgUp = useSyncExternalStore(subscribeLg, getLgSnapshot, getLgServerSnapshot);
  const rail = collapsed || !isLgUp;

  const setCollapsed = useCallback((next: boolean) => {
    setCollapsedState(next);
  }, []);

  return (
    <SidebarContext.Provider value={{ collapsed, rail, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
