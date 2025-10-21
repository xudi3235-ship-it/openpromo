import type { InboxSummary } from "@shared/insights";
import { Inbox, Reply, Timer } from "lucide-react";

type InsightsInboxSummaryProps = {
  summary?: InboxSummary;
};

function formatMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "—";
  if (minutes < 1) return "<1 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(1)} hr`;
  return `${(hours / 24).toFixed(1)} d`;
}

export function InsightsInboxSummary({ summary }: InsightsInboxSummaryProps) {
  const responseRate =
    summary?.responseRate !== undefined
      ? `${Math.round(summary.responseRate * 100)}%`
      : "—";

  const cards = [
    {
      label: "Inbound messages",
      value: summary?.totalInboundMessages ?? 0,
      icon: Inbox,
      description: "Messages from followers",
    },
    {
      label: "Avg. first response",
      value: formatMinutes(summary?.averageFirstResponseMinutes ?? null),
      icon: Timer,
      description: "Time to first reply",
    },
    {
      label: "Response rate",
      value: responseRate,
      icon: Reply,
      description: "Conversations answered",
    },
  ];

  return (
    <div className="bg-card rounded-lg p-6 border border-border/40">
      <div className="mb-4">
        <h2 className="font-medium text-foreground mb-1">Inbox Snapshot</h2>
        <p className="text-xs text-muted-foreground">
          How quickly your team responds to audience messages
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-lg border border-border/40 p-4 bg-background"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {card.label}
                </span>
              </div>
              <div className="text-2xl font-semibold text-foreground mb-1">
                {typeof card.value === "number"
                  ? card.value.toLocaleString()
                  : card.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-4 text-xs text-muted-foreground flex items-center gap-4">
        <span>
          Conversations: {summary?.totalConversations?.toLocaleString() ?? 0}
        </span>
        <span>
          Open threads: {summary?.openMessages?.toLocaleString() ?? 0}
        </span>
      </div>
    </div>
  );
}
