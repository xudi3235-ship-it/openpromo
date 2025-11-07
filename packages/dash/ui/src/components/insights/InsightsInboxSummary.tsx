import type { InboxSummary } from "@shared/insights";
import { Inbox, Reply, Timer } from "lucide-react";
import { MomentumCard } from "@/components/momentum/MomentumCard";

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
    <MomentumCard className="space-y-5">
      <div>
        <h2 className="font-medium text-foreground mb-1">Inbox snapshot</h2>
        <p className="text-xs text-muted-foreground">
          Response health across all connected channels
        </p>
      </div>
      <div className="space-y-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="flex items-center justify-between rounded-2xl border border-border/40 px-4 py-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {card.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.description}
                </p>
              </div>
              <p className="text-2xl font-semibold text-foreground">
                {typeof card.value === "number"
                  ? card.value.toLocaleString()
                  : card.value}
              </p>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4 border-t border-border/30 pt-3 text-xs text-muted-foreground">
        <span>
          Conversations: {summary?.totalConversations?.toLocaleString() ?? 0}
        </span>
        <span>
          Open threads: {summary?.openMessages?.toLocaleString() ?? 0}
        </span>
      </div>
    </MomentumCard>
  );
}
