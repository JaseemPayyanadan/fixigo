// src/components/ui/Button.tsx
"use client";

import React from "react";

import Link from "next/link";

export type ButtonVariant = "primary" | "secondary" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  secondary: "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm md:h-8 lg:h-9",
  md: "h-11 px-4 text-sm md:h-9 lg:h-11",
  lg: "h-12 px-4 text-sm md:h-10 lg:h-12",
  icon: "h-11 w-11 md:h-9 md:w-9 lg:h-11 lg:w-11",
};

const BASE_CLASSES =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:pointer-events-none";

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
}

type ButtonAsButton = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className"> & { href?: undefined };

type ButtonAsLink = CommonProps &
  Omit<React.ComponentProps<typeof Link>, "className"> & { href: string };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

/** Shared button surface: one place for the primary/secondary/danger look
 * every purchase and repair action button was previously rebuilding by hand.
 * Renders a `<Link>` when `href` is passed, a `<button>` otherwise, so call
 * sites don't need two components for the same visual style. */
export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  // fullWidth must be allowed to shrink inside flex footers; shrink-0 only for
  // intrinsic-width buttons so they don't get crushed by siblings.
  const classes = [
    BASE_CLASSES,
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    fullWidth ? "w-full min-w-0 flex-1" : "shrink-0",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (rest.href !== undefined) {
    const { href, ...linkRest } = rest as ButtonAsLink;
    return (
      <Link href={href} className={classes} {...linkRest}>
        {children}
      </Link>
    );
  }

  const { type = "button", ...buttonRest } = rest as ButtonAsButton;
  return (
    <button type={type} className={classes} {...buttonRest}>
      {children}
    </button>
  );
}

export default Button;
