import type { Platform } from "@core/schemas/connected-account.sql";
import { Avatar } from "@openpromo/ui/components/avatar";
import { Button } from "@openpromo/ui/components/button";
import { Card } from "@openpromo/ui/components/card";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Users } from "lucide-react";
import { getPlatformMeta } from "@/components/composer/utils/platform-style";
import type { ConnectedAccount } from "@/lib/hono-client";

type FollowersOverviewProps = {
  accounts: ConnectedAccount[];
  isLoading?: boolean;
};

const platformLabels: Record<string, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
};

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

function formatFollowers(value: number | null | undefined) {
  if (value === null || value === undefined) return "0";
  if (value >= 1_000_000)
    return `${numberFormatter.format(value / 1_000_000)}M`;
  if (value >= 1_000) return `${numberFormatter.format(value / 1_000)}K`;
  return numberFormatter.format(value);
}

export function FollowersOverview({
  accounts,
  isLoading,
}: FollowersOverviewProps) {
  if (isLoading) {
    return (
      <Card className="border-border/30 p-2.5 shadow-none">
        <div className="flex items-center gap-2">
          {["one", "two", "three"].map((key) => (
            <div
              key={key}
              className="flex items-center gap-2 rounded-lg border border-border/30 p-2 flex-1"
            >
              <Skeleton className="h-7 w-7 rounded-lg" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-2.5 w-14" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const sorted = [...accounts].sort(
    (a, b) => (b.followersCount ?? 0) - (a.followersCount ?? 0),
  );

  if (sorted.length === 0) {
    return (
      <Card className="border-border/30 p-2.5 shadow-none">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xs font-semibold text-foreground">
              Connect your first account
            </h2>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
              Plug in Facebook, Instagram, or TikTok to start tracking
              followers.
            </p>
          </div>
          <Button disabled size="sm">
            Connect
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-border/30 p-2.5 shadow-none group">
      <div className="flex items-center gap-2 overflow-x-auto">
        {sorted.map((account) => {
          const followers = account.followersCount ?? 0;
          const label = platformLabels[account.platform] ?? account.platform;
          const refreshedAt = account.metricsRefreshedAt
            ? formatDistanceToNow(new Date(account.metricsRefreshedAt), {
                addSuffix: true,
              })
            : "Never";

          const platformMeta = getPlatformMeta(account.platform as Platform);
          const Icon = platformMeta.icon;

          return (
            <div
              key={account.id}
              className="flex items-center gap-2 rounded-lg border border-border/30 p-2 flex-1 min-w-0 hover:border-border/50 transition-colors"
            >
              <div className="relative shrink-0">
                <Avatar className="h-7 w-7">
                  {account.profilePicUrl ? (
                    <img
                      src={account.profilePicUrl}
                      alt={account.accountName ?? label}
                      className="h-7 w-7 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-[10px] font-semibold">
                      {label.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </Avatar>
                <div
                  className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-background bg-background shadow-sm ${platformMeta.accentTextClass}`}
                >
                  <Icon className="h-2.5 w-2.5" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {account.accountName ?? label}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                  <Users className="h-2.5 w-2.5" />
                  <span className="font-medium tabular-nums">
                    {formatFollowers(followers)}
                  </span>
                </div>
              </div>
              <p className="text-[9px] text-muted-foreground/70 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shrink-0">
                {refreshedAt}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
