import { cn } from "@/components/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingSpinnerProps {
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function LoadingSpinner({
  size = "default",
  className,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    default: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900",
        sizeClasses[size],
        className,
      )}
    />
  );
}

interface LoadingCardProps {
  className?: string;
}

export function LoadingCard({ className }: LoadingCardProps) {
  return (
    <div
      className={cn(
        "p-6 bg-card rounded-xl border border-border animate-pulse",
        className,
      )}
    >
      <div className="flex items-start gap-3 mb-4">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-4 mb-2" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <Skeleton className="h-3" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-9" />
    </div>
  );
}

interface LoadingGridProps {
  count?: number;
  variant?: "default" | "small";
  className?: string;
}

export function LoadingGrid({
  count = 6,
  variant = "default",
  className,
}: LoadingGridProps) {
  return (
    <div
      className={cn(
        variant === "small" ? "card-grid-sm" : "card-grid",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <LoadingCard
          key={`loading-card-${
            // biome-ignore lint/suspicious/noArrayIndexKey: valid
            i
          }`}
        />
      ))}
    </div>
  );
}

interface LoadingListProps {
  count?: number;
  className?: string;
}

export function LoadingList({ count = 5, className }: LoadingListProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`loading-list-${
            // biome-ignore lint/suspicious/noArrayIndexKey: valid
            i
          }`}
          className="flex items-center gap-3 p-4 bg-card rounded-lg border border-border animate-pulse"
        >
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 mb-2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="w-20 h-8" />
        </div>
      ))}
    </div>
  );
}

interface LoadingPageProps {
  title?: boolean;
  description?: boolean;
  action?: boolean;
  content?: "grid" | "list";
  className?: string;
}

export function LoadingPage({
  title = true,
  description = true,
  action = true,
  content = "grid",
  className,
}: LoadingPageProps) {
  return (
    <div className={cn("page-container animate-pulse", className)}>
      {(title || description || action) && (
        <div className="page-header">
          <div>
            {title && <Skeleton className="h-8 w-64 mb-2" />}
            {description && <Skeleton className="h-4 w-96" />}
          </div>
          {action && <Skeleton className="w-32 h-9" />}
        </div>
      )}
      <div className="page-content">
        {content === "grid" ? <LoadingGrid /> : <LoadingList />}
      </div>
    </div>
  );
}
