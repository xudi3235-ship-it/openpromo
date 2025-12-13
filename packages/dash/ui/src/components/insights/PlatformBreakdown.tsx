import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@openpromo/ui/components/collapsible";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import type { MergedContentEntity } from "@worker/shared/content-types";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { FaFacebook, FaInstagram, FaTiktok } from "react-icons/fa";
import { MomentumCard } from "@/components/momentum/MomentumCard";
import { matchEntity } from "@/lib/hono-client";

type PlatformBreakdownProps = {
  items?: MergedContentEntity[];
  isLoading?: boolean;
};

type PlatformMetrics = {
  reach: number;
  engagement: number;
  posts: number;
};

type PlatformKey = "instagram" | "facebook" | "tiktok";

const platformConfig: Record<
  PlatformKey,
  {
    label: string;
    icon: typeof FaInstagram;
    color: string;
    prefix: string;
  }
> = {
  instagram: {
    label: "Instagram",
    icon: FaInstagram,
    color: "text-pink-600",
    prefix: "IG_",
  },
  facebook: {
    label: "Facebook",
    icon: FaFacebook,
    color: "text-blue-600",
    prefix: "FB_",
  },
  tiktok: {
    label: "TikTok",
    icon: FaTiktok,
    color: "text-foreground",
    prefix: "TT_",
  },
};

function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

export function PlatformBreakdown({
  items,
  isLoading,
}: PlatformBreakdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) {
    return (
      <MomentumCard>
        <Skeleton className="h-5 w-32 rounded" />
      </MomentumCard>
    );
  }

  // Aggregate metrics by platform
  const platformMetrics: Record<PlatformKey, PlatformMetrics> = {
    instagram: { reach: 0, engagement: 0, posts: 0 },
    facebook: { reach: 0, engagement: 0, posts: 0 },
    tiktok: { reach: 0, engagement: 0, posts: 0 },
  };

  for (const item of items ?? []) {
    matchEntity(item, {
      content: ({ entity }) => {
        const placement = entity.placement;
        let platform: PlatformKey | null = null;

        if (placement.startsWith("IG_")) platform = "instagram";
        else if (placement.startsWith("FB_")) platform = "facebook";
        else if (placement.startsWith("TT_")) platform = "tiktok";

        if (platform) {
          platformMetrics[platform].reach +=
            entity.metrics?.reach ?? entity.metrics?.impressions ?? 0;
          platformMetrics[platform].engagement +=
            entity.metrics?.engagement ?? 0;
          platformMetrics[platform].posts += 1;
        }
      },
      group: ({ contents }) => {
        for (const content of contents) {
          const placement = content.placement;
          let platform: PlatformKey | null = null;

          if (placement.startsWith("IG_")) platform = "instagram";
          else if (placement.startsWith("FB_")) platform = "facebook";
          else if (placement.startsWith("TT_")) platform = "tiktok";

          if (platform) {
            platformMetrics[platform].reach +=
              content.metrics?.reach ?? content.metrics?.impressions ?? 0;
            platformMetrics[platform].engagement +=
              content.metrics?.engagement ?? 0;
            platformMetrics[platform].posts += 1;
          }
        }
      },
    });
  }

  // Filter to only platforms with data
  const activePlatforms = (
    Object.entries(platformMetrics) as [PlatformKey, PlatformMetrics][]
  ).filter(([, metrics]) => metrics.posts > 0);

  if (activePlatforms.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <MomentumCard className="space-y-0">
        <CollapsibleTrigger className="flex w-full items-center justify-between py-1">
          <h3 className="text-sm font-medium text-foreground">By platform</h3>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {activePlatforms.map(([key, metrics]) => {
              const config = platformConfig[key];
              const Icon = config.icon;

              return (
                <div
                  key={key}
                  className="rounded-xl border border-border/40 p-4 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${config.color}`} />
                    <span className="text-sm font-medium text-foreground">
                      {config.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-lg font-semibold text-foreground">
                        {formatNumber(metrics.reach)}
                      </p>
                      <p className="text-xs text-muted-foreground">reach</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground">
                        {formatNumber(metrics.engagement)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        engagement
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </MomentumCard>
    </Collapsible>
  );
}
