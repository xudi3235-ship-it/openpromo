/** biome-ignore-all lint/suspicious/noArrayIndexKey: ok */
import { Card } from "@openpromo/ui/components/card";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@openpromo/ui/components/item";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import type { InboxSummary } from "@shared/insights";
import { Clock, MailOpen, MessageCircle, MessageSquare } from "lucide-react";

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

      <ItemGroup className="mt-3 gap-2">
        <Item variant="outline" size="sm" className="border-border/30">
          <ItemMedia>
            <MailOpen className="h-4 w-4 text-muted-foreground" />
          </ItemMedia>
          <ItemContent>
            <ItemTitle className="text-xs">Open conversations</ItemTitle>
            <ItemDescription className="text-[10px]">
              Messages waiting for a reply
            </ItemDescription>
          </ItemContent>
          <span className="text-lg font-semibold text-foreground tabular-nums">
            {formatNumber(summary?.openMessages)}
          </span>
        </Item>

        <Item variant="outline" size="sm" className="border-border/30">
          <ItemMedia>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </ItemMedia>
          <ItemContent>
            <ItemTitle className="text-xs">Response rate</ItemTitle>
            <ItemDescription className="text-[10px]">
              Conversations with a reply
            </ItemDescription>
          </ItemContent>
          <span className="text-lg font-semibold text-foreground tabular-nums">
            {responseRate}
          </span>
        </Item>

        <Item variant="outline" size="sm" className="border-border/30">
          <ItemMedia>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </ItemMedia>
          <ItemContent>
            <ItemTitle className="text-xs">Avg. first response</ItemTitle>
            <ItemDescription className="text-[10px]">
              Time to first reply across conversations
            </ItemDescription>
          </ItemContent>
          <span className="text-lg font-semibold text-foreground tabular-nums">
            {formatDuration(summary?.averageFirstResponseMinutes)}
          </span>
        </Item>

        <Item variant="outline" size="sm" className="border-border/30">
          <ItemMedia>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </ItemMedia>
          <ItemContent>
            <ItemTitle className="text-xs">Inbound messages</ItemTitle>
            <ItemDescription className="text-[10px]">
              Total messages received
            </ItemDescription>
          </ItemContent>
          <span className="text-lg font-semibold text-foreground tabular-nums">
            {formatNumber(summary?.totalInboundMessages)}
          </span>
        </Item>
      </ItemGroup>
    </Card>
  );
}
