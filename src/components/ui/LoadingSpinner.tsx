import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div
          className={cn(
            "animate-spin rounded-full border-b-2 border-blue-600",
            sizeClasses[size],
            className
          )}
          role="status"
          aria-label="Loading"
        />
        <p className="text-gray-500">Loading...</p>
      </div>
    </div>
  );
} 