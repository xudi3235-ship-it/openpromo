import type { InsightsStatus } from "@shared/insights";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { MomentumCard } from "@/components/momentum/MomentumCard";

type HomeSystemHealthCardProps = {
  status?: InsightsStatus;
  workspaceSlug: string;
};

const healthItems = (
  status?: InsightsStatus,
  workspaceSlug?: string,
): Array<{
  label: string;
  value: Date | null | undefined;
  href: string;
}> => [
  {
    label: "Content metrics",
    value: status?.contentLastRefreshedAt,
    href: `/workspaces/${workspaceSlug}/insights`,
  },
  {
    label: "Followers",
    value: status?.followerLastCollectedAt,
    href: `/workspaces/${workspaceSlug}/insights`,
  },
  {
    label: "Inbox",
    value: status?.inboxLastUpdatedAt,
    href: `/workspaces/${workspaceSlug}/inbox`,
  },
];

function formatRelative(value?: Date | string | null) {
  if (!value) return "Never";
  const date = value instanceof Date ? value : new Date(value);
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Under 1h ago";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function HomeSystemHealthCard({
  status,
  workspaceSlug,
}: HomeSystemHealthCardProps) {
  const items = healthItems(status, workspaceSlug);

  return (
    <MomentumCard className="space-y-4" tone="subtle">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-sm text-foreground">System health</p>
          <p className="text-xs text-muted-foreground">
            Keep data fresh and automations running
          </p>
        </div>
        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="space-y-3">
        {items.map((item) => {
          const isStale =
            !item.value ||
            Date.now() - new Date(item.value ?? 0).getTime() >
              1000 * 60 * 60 * 24;
          return (
            <Link
              key={item.label}
              to={item.href}
              params={{ workspaceSlug }}
              className="flex items-center justify-between rounded-xl border border-border/30 px-3 py-2 hover:bg-muted/30 transition"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatRelative(item.value)}
                </p>
              </div>
              {isStale ? (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              )}
            </Link>
          );
        })}
      </div>
    </MomentumCard>
  );
}
