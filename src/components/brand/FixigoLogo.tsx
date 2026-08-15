import type { SVGProps } from "react";

type LogoTone = "brand" | "inverse";
type LogoVariant = "mark" | "lockup";

export type FixigoLogoProps = {
  variant?: LogoVariant;
  tone?: LogoTone;
  /** Width and height of the mark, in pixels. */
  size?: number;
  showTagline?: boolean;
  className?: string;
};

const BRAND = "#2563EB";

function Mark({
  tone,
  size,
  className,
  decorative = true,
  ...rest
}: {
  tone: LogoTone;
  size: number;
  className?: string;
  decorative?: boolean;
} & Omit<SVGProps<SVGSVGElement>, "viewBox">) {
  const badge = tone === "inverse" ? "#FFFFFF" : BRAND;
  const fg = tone === "inverse" ? BRAND : "#FFFFFF";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : "Fixigo"}
      {...rest}
    >
      <rect width="64" height="64" rx="14" fill={badge} />
      <path fill={fg} d="M22.5 15h25v8H32.5v26h-10z" />
      <path
        fill={fg}
        fillRule="evenodd"
        d="M35.7 25.5 41.33 28.75v6.5L35.7 38.5 30.07 35.25v-6.5Z M37.9 32a2.2 2.2 0 1 1-4.4 0 2.2 2.2 0 1 1 4.4 0Z"
      />
    </svg>
  );
}

export function FixigoLogo({ variant = "mark", tone = "brand", size = 32, showTagline = false, className }: FixigoLogoProps) {
  if (variant === "mark") {
    return <Mark tone={tone} size={size} className={className} decorative={false} />;
  }

  const titleColor = tone === "inverse" ? "text-white" : "text-slate-900";
  const taglineColor = tone === "inverse" ? "text-white/70" : "text-slate-400";
  const titleClass = size >= 48 ? "text-3xl" : size >= 40 ? "text-2xl" : "text-sm";
  const taglineClass = size >= 48 ? "text-sm" : "text-[10px]";

  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <Mark tone={tone} size={size} className="shrink-0" />
      <div className="min-w-0 leading-tight">
        <p className={`truncate font-bold tracking-tight ${titleClass} ${titleColor}`}>Fixigo</p>
        {showTagline ? <p className={`truncate ${taglineClass} ${taglineColor}`}>Repair Management</p> : null}
      </div>
    </div>
  );
}
