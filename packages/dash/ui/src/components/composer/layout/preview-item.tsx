import { Badge } from "@openpromo/ui/components/badge";
import { cn } from "@openpromo/ui/lib/utils";
import { getPlatformMeta } from "@/components/composer/utils/platform-style";
import type { ConnectedAccount } from "@/lib/hono-client";

interface PreviewItemProps {
  account: ConnectedAccount;
  contentType: "reel" | "feed";
  isActive: boolean;
  children: React.ReactNode;
}

export function PreviewItem({
  account,
  contentType,
  isActive,
  children,
}: PreviewItemProps) {
  const meta = getPlatformMeta(account.platform);
  const accountLabel = account.accountName || meta.label;
  const contentLabel =
    account.platform === "TIKTOK"
      ? "TikTok Preview"
      : `${meta.label} ${contentType === "reel" ? "Reel" : "Feed"}`;

  return (
    <div className="flex w-[280px] flex-col gap-2 flex-shrink-0">
      <div className="flex flex-col items-center gap-1 text-center">
        <div className="flex items-center justify-center gap-2 px-1 text-xs font-medium text-foreground">
          <span
            className="inline-flex h-2.5 w-2.5 rounded-full border border-border"
            style={{ backgroundColor: meta.accentColor }}
          />
          <span className="truncate max-w-[180px]" title={accountLabel}>
            {accountLabel}
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground">{contentLabel}</div>
      </div>
      <div
        className={cn(
          "w-[280px] rounded-2xl",
          isActive && cn("ring-2 ring-offset-2", meta.accentRingClass),
        )}
      >
        {children}
      </div>
      {isActive && (
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
