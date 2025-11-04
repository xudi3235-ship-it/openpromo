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
}

export function PreviewHeader({
  accountName = "Account",
  profilePicUrl,
  timestamp,
  location,
  actions,
  variant = "default",
  size = "default",
  className,
}: PreviewHeaderProps) {
  const isCompact = size === "thumbnail" || size === "compact";

  const avatarSize = isCompact ? "w-8 h-8" : "w-10 h-10";
  const nameSize = isCompact ? "text-xs" : "text-sm";
  const metaSize = isCompact ? "text-[10px]" : "text-xs";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2",
        isCompact ? "p-2" : "p-3",
        className,
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Avatar className={cn(avatarSize, "flex-shrink-0")}>
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

          {variant !== "minimal" && (timestamp || location) && (
            <div
              className={cn(
                "text-muted-foreground flex items-center gap-1",
                metaSize,
              )}
            >
              {timestamp && <span>{timestamp}</span>}
              {timestamp && location && <span>•</span>}
              {location && (
                <span className="truncate flex items-center gap-0.5">
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
                  {location}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {actions && <div className="flex-shrink-0">{actions}</div>}
    </div>
  );
}
