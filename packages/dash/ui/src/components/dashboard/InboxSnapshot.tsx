/** biome-ignore-all lint/suspicious/noArrayIndexKey: ok */
import { Card } from "@openpromo/ui/components/card";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import type { InboxSummary } from "@shared/insights";
import { MailOpen, MessageCircle } from "lucide-react";

type InboxSnapshotProps = {
  summary?: InboxSummary;
  isLoading?: boolean;
};

const numberFormatter = new Intl.NumberFormat("en-US");

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "0";
  return numberFormatter.format(value);
}

function formatDuration(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined) return "—";
  if (minutes < 1) return "<1 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(1)} hr`;
  return `${(hours / 24).toFixed(1)} d`;
}

export function InboxSnapshot({ summary, isLoading }: InboxSnapshotProps) {
  if (isLoading) {
    return (
      <Card className="border-border/30 p-4 shadow-none">
        <Skeleton className="h-4 w-32" />
        <div className="mt-3 space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const responseRate =
    summary && summary.responseRate !== undefined
      ? `${Math.round(summary.responseRate * 100)}%`
      : "—";

  return (
    <Card className="border-border/30 p-4 shadow-none">
      <div className="flex items-start gap-2">
        <MailOpen className="h-4 w-4 text-muted-foreground mt-0.5" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Inbox health
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Watch open conversations and response speed.
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between rounded-lg border border-border/30 p-2.5">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">
              Open conversations
            </p>
            <p className="text-[10px] text-muted-foreground/70 leading-tight">
              Messages waiting for a reply
            </p>
          </div>
          <span className="text-lg font-semibold text-foreground tabular-nums ml-2">
            {formatNumber(summary?.openMessages)}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border/30 p-2.5">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">Response rate</p>
            <p className="text-[10px] text-muted-foreground/70 leading-tight">
              Conversations with a reply
            </p>
          </div>
          <span className="text-lg font-semibold text-foreground tabular-nums ml-2">
            {responseRate}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border/30 p-2.5">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">
              Avg. first response
            </p>
            <p className="text-[10px] text-muted-foreground/70 leading-tight">
              Time to first reply across conversations
            </p>
          </div>
          <span className="text-lg font-semibold text-foreground tabular-nums ml-2">
            {formatDuration(summary?.averageFirstResponseMinutes)}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border/30 p-2.5">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">
                Inbound messages
              </p>
              <p className="text-[10px] text-muted-foreground/70 leading-tight">
                Total messages received
              </p>
            </div>
          </div>
          <span className="text-lg font-semibold text-foreground tabular-nums ml-2">
            {formatNumber(summary?.totalInboundMessages)}
          </span>
        </div>
      </div>
    </Card>
  );
}
