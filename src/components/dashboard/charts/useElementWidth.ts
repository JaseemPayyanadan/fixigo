"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tracks an element's rendered width so charts can draw at real pixel size.
 * Scaling a viewBox instead would distort axis text.
 */
export function useElementWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width;
      if (next && next > 0) setWidth(next);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
