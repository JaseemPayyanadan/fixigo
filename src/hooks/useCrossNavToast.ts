"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React from "react";

/** Builds the href a page navigates to when it wants the destination page to show a toast. */
export function toastHref(path: string, message: string): string {
  return `${path}?toast=${encodeURIComponent(message)}`;
}

/**
 * Reads a `?toast=` query param left by {@link toastHref}, surfaces it as local state,
 * and strips it from the URL so a refresh doesn't re-show the message.
 */
export function useCrossNavToast(path: string) {
  const router = useRouter();
  const toastParam = useSearchParams().get("toast");
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!toastParam) return;
    setMessage(toastParam);
    router.replace(path);
  }, [toastParam, router, path]);

  return [message, setMessage] as const;
}
