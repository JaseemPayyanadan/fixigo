"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface VirtualListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
}

interface VirtualListState {
  scrollTop: number;
  startIndex: number;
  endIndex: number;
  visibleItems: number;
}

/**
 * High-performance virtual scrolling component for large lists
 * Only renders visible items + overscan for smooth scrolling
 */
export function VirtualList<T>({ items, height, itemHeight, renderItem, overscan = 3, className = "", onScroll }: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<VirtualListState>({
    scrollTop: 0,
    startIndex: 0,
    endIndex: 0,
    visibleItems: 0,
  });

  // Calculate visible range based on scroll position
  const calculateVisibleRange = useCallback(
    (scrollTop: number) => {
      const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
      const visibleItems = Math.ceil(height / itemHeight);
      const endIndex = Math.min(items.length - 1, startIndex + visibleItems + overscan * 2);

      return {
        scrollTop,
        startIndex,
        endIndex,
        visibleItems,
      };
    },
    [height, itemHeight, overscan, items.length]
  );

  // Handle scroll events with throttling
  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const scrollTop = event.currentTarget.scrollTop;
      const newState = calculateVisibleRange(scrollTop);

      setState(newState);
      onScroll?.(scrollTop);
    },
    [calculateVisibleRange, onScroll]
  );

  // Update visible range when items change
  useEffect(() => {
    const newState = calculateVisibleRange(state.scrollTop);
    setState(newState);
  }, [items, calculateVisibleRange, state.scrollTop]);

  // Memoize visible items to prevent unnecessary re-renders
  const visibleItems = useMemo(() => {
    return items.slice(state.startIndex, state.endIndex + 1);
  }, [items, state.startIndex, state.endIndex]);

  // Calculate total height and transform for positioning
  const totalHeight = items.length * itemHeight;
  const transform = `translateY(${state.startIndex * itemHeight}px)`;

  return (
    <div ref={containerRef} className={`overflow-auto ${className}`} style={{ height }} onScroll={handleScroll}>
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform }}>
          {visibleItems.map((item, index) => {
            const actualIndex = state.startIndex + index;
            return (
              <div
                key={actualIndex}
                style={{
                  height: itemHeight,
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                }}
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Performance-optimized wrapper for virtual lists
export const withVirtualScrolling = <P extends object>(
  Component: React.ComponentType<P>,
  options: {
    itemHeight: number;
    overscan?: number;
  }
) => {
  const WrappedComponent = React.memo((props: P) => {
    return <Component {...props} />;
  });

  WrappedComponent.displayName = `withVirtualScrolling(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Hook for managing virtual list state
export function useVirtualList<T>(items: T[], itemHeight: number, containerHeight: number, overscan: number = 3) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleItems = Math.ceil(containerHeight / itemHeight);
    const endIndex = Math.min(items.length - 1, startIndex + visibleItems + overscan * 2);

    return { startIndex, endIndex, visibleItems };
  }, [items.length, itemHeight, containerHeight, overscan, scrollTop]);

  const handleScroll = useCallback((newScrollTop: number) => {
    setScrollTop(newScrollTop);
  }, []);

  const scrollToIndex = useCallback(
    (index: number) => {
      const newScrollTop = index * itemHeight;
      setScrollTop(newScrollTop);
    },
    [itemHeight]
  );

  return {
    scrollTop,
    visibleRange,
    handleScroll,
    scrollToIndex,
    totalHeight: items.length * itemHeight,
  };
}
