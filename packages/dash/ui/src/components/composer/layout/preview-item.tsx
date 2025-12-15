import { Badge } from "@openpromo/ui/components/badge";
import { cn } from "@openpromo/ui/lib/utils";
import { getPlatformMeta } from "@/components/composer/utils/platform-style";
import type { ConnectedAccount } from "@/lib/hono-client";

interface PreviewItemProps {
  account: ConnectedAccount;
  contentType: "reel" | "feed";
  isActive: boolean;
  children: React.ReactNode;
  size?: "default" | "compact" | "large";
}

export function PreviewItem({
  account,
  contentType,
  isActive,
  children,
  size = "default",
}: PreviewItemProps) {
  const meta = getPlatformMeta(account.platform);
  const accountLabel = account.accountName || meta.label;
  const contentLabel =
    account.platform === "TIKTOK"
      ? "TikTok Preview"
      : `${meta.label} ${contentType === "reel" ? "Reel" : "Feed"}`;

  return (
    <div
      className={cn(
        "flex flex-col flex-shrink-0",
        size === "compact"
          ? "w-[200px] sm:w-[220px] gap-1"
          : size === "large"
            ? "w-[300px] sm:w-[360px] lg:w-[380px] gap-2"
            : "w-[240px] sm:w-[280px] gap-1.5",
      )}
    >
      <div
        className={cn(
          "flex flex-col items-center text-center",
          size === "compact"
            ? "gap-0.5"
            : size === "large"
              ? "gap-1.5"
              : "gap-0.5",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center gap-2 px-1 font-medium text-foreground",
            size === "compact"
              ? "text-[11px]"
              : size === "large"
                ? "text-sm"
                : "text-xs",
          )}
        >
          <span
            className={cn(
              "rounded-full border border-border",
              size === "compact"
                ? "h-2.5 w-2.5"
                : size === "large"
                  ? "h-3 w-3"
                  : "h-2.5 w-2.5",
            )}
            style={{ backgroundColor: meta.accentColor }}
          />
          <span
            className={cn(
              "truncate",
              size === "compact"
                ? "max-w-[160px] sm:max-w-[180px]"
                : size === "large"
                  ? "max-w-[260px] sm:max-w-[300px]"
                  : "max-w-[200px] sm:max-w-[240px]",
            )}
            title={accountLabel}
          >
            {accountLabel}
          </span>
        </div>
        <div
          className={cn(
            "text-muted-foreground",
            size === "compact"
              ? "text-[10px]"
              : size === "large"
                ? "text-xs"
                : "text-[11px]",
          )}
        >
          {contentLabel}
        </div>
      </div>
      <div
        className={cn(
          "w-full rounded-2xl",
          size === "compact" && "rounded-xl",
          size === "large" && "rounded-3xl",
          isActive && cn("ring-2 ring-offset-2", meta.accentRingClass),
        )}
      >
        {children}
      </div>
      {isActive && (size === "default" || size === "large") && (
        <div className="flex justify-center">
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px] font-medium px-2 py-0.5",
              "bg-muted/80",
              meta.accentTextClass,
              size === "large" && "text-xs px-3 py-1",
            )}
          >
            Customizing
          </Badge>
        </div>
      )}
    </div>
  );
}
