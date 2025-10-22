import { formatDistanceToNow } from "date-fns";
import {
  Eye,
  Heart,
  MessageCircle,
  MousePointerClick,
  Share2,
  TrendingUp,
  Users,
} from "lucide-react";

type SummaryData = {
  totals: {
    impressions?: number;
    engagement?: number;
    reach?: number;
    clicks?: number;
    likes?: number;
    comments?: number;
    shares?: number;
  };
  lastRefreshedAt: string | null;
};

type InsightsSummaryCardsProps = {
  summary?: SummaryData;
};

export function InsightsSummaryCards({ summary }: InsightsSummaryCardsProps) {
  const totals = summary?.totals ?? {
    impressions: 0,
    engagement: 0,
    reach: 0,
    clicks: 0,
    likes: 0,
    comments: 0,
    shares: 0,
  };

  const lastRefreshed = summary?.lastRefreshedAt
    ? formatDistanceToNow(new Date(summary.lastRefreshedAt), {
        addSuffix: true,
      })
    : null;

  const cards = [
    {
      label: "Total Impressions",
      value: totals.impressions ?? 0,
      icon: Eye,
      color: "text-blue-500",
    },
    {
      label: "Total Engagement",
      value: totals.engagement ?? 0,
      icon: TrendingUp,
      color: "text-green-500",
    },
    {
      label: "Reach",
      value: totals.reach ?? 0,
      icon: Users,
      color: "text-teal-500",
    },
    {
      label: "Clicks",
      value: totals.clicks ?? 0,
      icon: MousePointerClick,
      color: "text-purple-500",
    },
    {
      label: "Likes",
      value: totals.likes ?? 0,
      icon: Heart,
      color: "text-red-500",
    },
    {
      label: "Comments",
      value: totals.comments ?? 0,
      icon: MessageCircle,
      color: "text-yellow-500",
    },
    {
      label: "Shares",
      value: totals.shares ?? 0,
      icon: Share2,
      color: "text-indigo-500",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-card rounded-lg p-4 border border-border/40"
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground mb-1">
                  {card.value.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>
      {lastRefreshed && (
        <p className="text-xs text-muted-foreground text-right">
          Last updated {lastRefreshed}
        </p>
      )}
    </div>
  );
}
