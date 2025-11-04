import { Badge } from "@openpromo/ui/components/badge";
import { cn } from "@openpromo/ui/lib/utils";
import { getPlatformMeta } from "@/components/composer/utils/platform-style";
import type { ConnectedAccount } from "@/lib/hono-client";

interface PreviewItemProps {
  account: ConnectedAccount;
  contentType: "reel" | "feed";
  isActive: boolean;
  children: React.ReactNode;
  size?: "default" | "compact";
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
        size === "compact" ? "w-[220px] gap-1.5" : "w-[280px] gap-2",
      )}
    >
      <div
        className={cn(
          "flex flex-col items-center text-center",
          size === "compact" ? "gap-0.5" : "gap-1",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center gap-2 px-1 font-medium text-foreground",
            size === "compact" ? "text-[11px]" : "text-xs",
          )}
        >
          <span
            className="inline-flex h-2.5 w-2.5 rounded-full border border-border"
            style={{ backgroundColor: meta.accentColor }}
          />
          <span className="truncate max-w-[180px]" title={accountLabel}>
            {accountLabel}
          </span>
        </div>
        <div
          className={cn(
            "text-muted-foreground",
            size === "compact" ? "text-[10px]" : "text-[11px]",
          )}
        >
          {contentLabel}
        </div>
      </div>
      <div
        className={cn(
          "w-full rounded-2xl",
          size === "compact" && "rounded-xl",
          isActive && cn("ring-2 ring-offset-2", meta.accentRingClass),
        )}
      >
        {children}
      </div>
      {isActive && size === "default" && (
        <div className="flex justify-center">
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px] font-medium px-2 py-0.5",
              "bg-muted/80",
              meta.accentTextClass,
            )}
          >
            Customizing
          </Badge>
        </div>
      )}
    </div>
  );
}
