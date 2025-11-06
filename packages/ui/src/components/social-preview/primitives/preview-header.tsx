import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@openpromo/ui/components/avatar";
import { cn } from "@openpromo/ui/lib/utils";
import type { BasePreviewProps } from "../types";

export interface PreviewHeaderProps extends BasePreviewProps {
  accountName?: string | null;
  profilePicUrl?: string | null;
  timestamp?: string | null;
  location?: string | null;
  /** Additional content to render in header (e.g., follow button, menu) */
  actions?: React.ReactNode;
  /** Style variant for different platforms */
  variant?: "default" | "minimal" | "detailed";
  /** Force showing meta row even for minimal variant */
  showMetaOnMinimal?: boolean;
  /** Layout for timestamp/location */
  metaLayout?: "inline" | "stacked";
  /** Override avatar size */
  avatarSize?: "xs" | "sm" | "md" | "lg";
  /** Toggle location pin icon */
  showLocationPin?: boolean;
}

export function PreviewHeader({
  accountName = "Account",
  profilePicUrl,
  timestamp,
  location,
  actions,
  variant = "default",
  size = "default",
  showMetaOnMinimal = false,
  metaLayout = "inline",
  avatarSize,
  showLocationPin = true,
  className,
}: PreviewHeaderProps) {
  const isCompact = size === "thumbnail" || size === "compact";

  const avatarSizeMap: Record<
    NonNullable<PreviewHeaderProps["avatarSize"]>,
    string
  > = {
    xs: "w-7 h-7",
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };
  const defaultAvatarSizeKey: NonNullable<PreviewHeaderProps["avatarSize"]> =
    isCompact ? "sm" : "md";
  const resolvedAvatarSize =
    avatarSizeMap[avatarSize ?? defaultAvatarSizeKey] ??
    avatarSizeMap[defaultAvatarSizeKey];
  const nameSize = isCompact ? "text-xs" : "text-sm";
  const metaSize = isCompact ? "text-[10px]" : "text-xs";
  const shouldShowMeta =
    (variant !== "minimal" || showMetaOnMinimal) && (timestamp || location);

  const locationDisplay = location ? (
    <span
      className={cn(
        "truncate",
        showLocationPin ? "flex items-center gap-0.5" : undefined,
      )}
    >
      {showLocationPin && (
        <svg
          className="w-3 h-3 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {location}
    </span>
  ) : null;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2",
        isCompact ? "p-2" : "p-3",
        className,
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Avatar className={cn(resolvedAvatarSize, "flex-shrink-0")}>
          <AvatarImage
            src={profilePicUrl || undefined}
            alt={accountName || ""}
          />
          <AvatarFallback>
            {accountName?.charAt(0)?.toUpperCase() || "A"}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className={cn("font-semibold truncate", nameSize)}>
            {accountName}
          </div>

          {shouldShowMeta && (
            <div
              className={cn(
                "text-muted-foreground",
                metaSize,
                metaLayout === "stacked"
                  ? "mt-0.5 space-y-0.5 leading-tight"
                  : "flex items-center gap-1",
              )}
            >
              {metaLayout === "stacked" ? (
                <>
                  {locationDisplay}
                  {timestamp && (
                    <span className="uppercase tracking-wide">{timestamp}</span>
                  )}
                </>
              ) : (
                <>
                  {timestamp && <span>{timestamp}</span>}
                  {timestamp && location && <span>•</span>}
                  {locationDisplay}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {actions && <div className="flex-shrink-0">{actions}</div>}
    </div>
  );
}
