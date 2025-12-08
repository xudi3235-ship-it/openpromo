import { Button } from "@openpromo/ui/components/button";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

export interface ErrorStateProps {
  /** Error object or message */
  error?: Error | string | null;
  /** Custom title for the error state */
  title?: string;
  /** Custom message for the error state */
  message?: string;
  /** Custom icon component */
  icon?: LucideIcon;
  /** Retry callback */
  onRetry?: () => void;
  /** Custom retry button label */
  retryLabel?: string;
  /** Custom actions to display instead of/in addition to retry */
  actions?: ReactNode;
  /** Variant styling */
  variant?: "default" | "minimal";
  /** Custom className for the container */
  className?: string;
}

/**
 * ErrorState - Reusable error state component
 *
 * A consistent error display with icon, title, message, and retry action.
 * Used across features for consistent error handling UX.
 *
 * @example
 * ```tsx
 * <ErrorState
 *   error={error}
 *   onRetry={() => refetch()}
 * />
 * ```
 *
 * @example Custom messaging
 * ```tsx
 * <ErrorState
 *   title="Failed to load posts"
 *   message="We couldn't fetch your content. Please check your connection."
 *   onRetry={handleRetry}
 * />
 * ```
 */
export function ErrorState({
  error,
  title = "Something went wrong",
  message,
  icon: Icon = AlertCircle,
  onRetry,
  retryLabel = "Retry",
  actions,
  variant = "default",
  className = "",
}: ErrorStateProps) {
  const errorMessage =
    message ||
    (error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "An unexpected error occurred. Please try again.");

  const minimalStyles =
    variant === "minimal" ? "min-h-[200px] p-4" : "min-h-[400px] p-8";

  return (
    <div
      className={`flex flex-col items-center justify-center space-y-4 ${minimalStyles} ${className}`}
    >
      <div className="rounded-full bg-destructive/10 p-3">
        <Icon className="h-8 w-8 text-destructive" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md">{errorMessage}</p>
      </div>
      {(onRetry || actions) && (
        <div className="flex items-center gap-2">
          {onRetry && (
            <Button onClick={onRetry} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              {retryLabel}
            </Button>
          )}
          {actions}
        </div>
      )}
    </div>
  );
}
