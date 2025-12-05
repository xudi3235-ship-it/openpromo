import { Badge } from "@openpromo/ui/components/badge";
import { Checkbox } from "@openpromo/ui/components/checkbox";
import { cn } from "@openpromo/ui/lib/utils";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { KeyboardEventHandler, ReactNode } from "react";

// Base card wrapper
interface GridCardProps {
  children: ReactNode;
  onClick?: () => void;
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
  className?: string;
  isHoverable?: boolean;
}

export function GridCard({
  children,
  onClick,
  className,
  isHoverable = true,
}: GridCardProps) {
  return (
    <div
      className={cn(
        "border overflow-hidden transition-all group relative rounded-lg border-gray-200 dark:border-gray-800",
        isHoverable &&
          "cursor-pointer hover:border-foreground/50 hover:shadow-md",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// Media container with aspect ratio
interface GridCardMediaProps {
  children: ReactNode;
  aspectRatio?: "square" | "video";
  className?: string;
}

export function GridCardMedia({
  children,
  aspectRatio = "square",
  className,
}: GridCardMediaProps) {
  return (
    <div
      className={cn(
        "bg-muted relative overflow-hidden",
        aspectRatio === "square" && "aspect-square",
        aspectRatio === "video" && "aspect-video",
        className,
      )}
    >
      {children}
    </div>
  );
}

// Top-left badges/indicators
interface GridCardBadgesProps {
  children: ReactNode;
  className?: string;
}

export function GridCardBadges({ children, className }: GridCardBadgesProps) {
  return (
    <div
      className={cn(
        "absolute top-2 left-2 z-10 flex items-center gap-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

// Selection checkbox
interface GridCardCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

export function GridCardCheckbox({
  checked,
  onCheckedChange,
  className,
}: GridCardCheckboxProps) {
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={onCheckedChange}
      onClick={(e) => e.stopPropagation()}
      className={cn("h-5 w-5", className)}
    />
  );
}

// Type badge (e.g., "Video", "Image", etc.)
interface GridCardTypeBadgeProps {
  icon?: ReactNode;
  label: string;
  className?: string;
}

export function GridCardTypeBadge({
  icon,
  label,
  className,
}: GridCardTypeBadgeProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full bg-background/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium border shadow-sm",
        className,
      )}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

// Official/verified badge
interface GridCardOfficialBadgeProps {
  label?: string;
  className?: string;
}

export function GridCardOfficialBadge({
  label = "Official",
  className,
}: GridCardOfficialBadgeProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full bg-white/90 dark:bg-gray-900/90 px-2.5 py-1 shadow-sm backdrop-blur-sm",
        className,
      )}
    >
      <CheckCircle2 className="h-3 w-3 text-green-600" />
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}

// Top-right actions menu
interface GridCardActionsProps {
  children: ReactNode;
  showOnHover?: boolean;
  className?: string;
}

export function GridCardActions({
  children,
  showOnHover = true,
  className,
}: GridCardActionsProps) {
  return (
    <div
      className={cn(
        "absolute top-2 right-2 z-20",
        showOnHover &&
          "opacity-0 transition-opacity duration-200 group-hover:opacity-100",
        className,
      )}
    >
      {children}
    </div>
  );
}

// State overlays
type StateType = "loading" | "processing" | "failed" | "completed" | "queued";

interface GridCardStateOverlayProps {
  state: StateType;
  message?: string;
  className?: string;
}

export function GridCardStateOverlay({
  state,
  message,
  className,
}: GridCardStateOverlayProps) {
  if (state === "loading" || state === "processing" || state === "queued") {
    return (
      <div
        className={cn(
          "absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm",
          className,
        )}
      >
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <span className="text-xs font-medium text-white">
            {message || (state === "queued" ? "Queued" : "Processing")}
          </span>
        </div>
      </div>
    );
  }

  if (state === "failed") {
    return (
      <div
        className={cn(
          "absolute inset-0 z-10 flex flex-col items-center justify-center bg-red-500/10 backdrop-blur-sm",
          className,
        )}
      >
        <div className="flex flex-col items-center gap-2">
          <AlertCircle className="h-8 w-8 text-red-600" />
          <span className="text-xs font-medium text-red-600">
            {message || "Failed"}
          </span>
        </div>
      </div>
    );
  }

  if (state === "completed") {
    return (
      <div
        className={cn(
          "absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm",
          className,
        )}
      >
        <div className="flex flex-col items-center gap-2">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
          <span className="text-xs font-medium text-white">
            {message || "Completed"}
          </span>
        </div>
      </div>
    );
  }

  return null;
}

// Bottom metadata section
interface GridCardFooterProps {
  children: ReactNode;
  className?: string;
}

export function GridCardFooter({ children, className }: GridCardFooterProps) {
  return <div className={cn("p-2.5 bg-background", className)}>{children}</div>;
}

// Status badge for footer
interface GridCardStatusBadgeProps {
  variant?: "secondary" | "destructive" | "default" | "outline";
  children: ReactNode;
  className?: string;
}

export function GridCardStatusBadge({
  variant = "secondary",
  children,
  className,
}: GridCardStatusBadgeProps) {
  return (
    <Badge
      variant={variant}
      className={cn("px-1.5 py-0 text-[10px] h-auto", className)}
    >
      {children}
    </Badge>
  );
}

// Hover overlay (like StyleCard's gradient overlay)
interface GridCardHoverOverlayProps {
  children: ReactNode;
  className?: string;
}

export function GridCardHoverOverlay({
  children,
  className,
}: GridCardHoverOverlayProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100",
        className,
      )}
    >
      {children}
    </div>
  );
}
