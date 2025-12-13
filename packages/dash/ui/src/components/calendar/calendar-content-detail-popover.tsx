import type { UnifiedContentMetrics } from "@core/schemas/content.sql";
import { Badge } from "@openpromo/ui/components/badge";
import { Caption, Text } from "@openpromo/ui/components/typography";
import type { AllPlacement, PlacementSpec } from "@shared/content";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Eye, Heart, MessageCircle, Share2 } from "lucide-react";
import {
  getPlatformIcon,
  getPlatformName,
} from "@/components/content/utils/platform-icons";
import { matchPlacementSpec } from "@/lib/hono-client";

const POPOVER_METRICS: {
  key: keyof UnifiedContentMetrics;
  label: string;
  icon: React.ReactNode;
}[] = [
  { key: "reach", label: "Reach", icon: <Eye className="h-3 w-3" /> },
  { key: "likes", label: "Likes", icon: <Heart className="h-3 w-3" /> },
  {
    key: "comments",
    label: "Comments",
    icon: <MessageCircle className="h-3 w-3" />,
  },
  { key: "shares", label: "Shares", icon: <Share2 className="h-3 w-3" /> },
];

function formatMetric(value?: number | null) {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value.toLocaleString();
  }
  return "—";
}

function getThumbnailFromPlacement(
  placementSpec: PlacementSpec,
): string | undefined {
  if (placementSpec?.thumbnailUrl) {
    return placementSpec.thumbnailUrl;
  }

  const attachments = placementSpec?.attachments;
  if (attachments && attachments.length > 0) {
    const firstAttachment = attachments.find(
      (att) => att.publicUrl || att.thumbnailUrl,
    );
    if (firstAttachment?.thumbnailUrl) {
      return firstAttachment.thumbnailUrl;
    }
    if (firstAttachment?.publicUrl) {
      return firstAttachment.publicUrl;
    }
  }

  return undefined;
}

type CalendarContentDetailPopoverContentProps = {
  placementSpec: PlacementSpec;
  placement: AllPlacement;
  metrics?: UnifiedContentMetrics;
  metricsRefreshedAt?: Date | null;
  permalinkUrl?: string | null;
};

export function CalendarContentDetailPopoverContent({
  placementSpec,
  placement,
  metrics = {},
  metricsRefreshedAt,
  permalinkUrl,
}: CalendarContentDetailPopoverContentProps) {
  const thumbnailSrc = getThumbnailFromPlacement(placementSpec);

  const message = matchPlacementSpec(placementSpec, {
    FBFeed: (s) => s.postSpec.message,
    IGFeed: (s) => s.caption,
    TTFeed: (s) => s.caption,
  });

  const refreshLabel = metricsRefreshedAt
    ? `Updated ${formatDistanceToNow(metricsRefreshedAt, { addSuffix: true })}`
    : null;

  return (
    <div className="space-y-3 w-72">
      {/* Thumbnail */}
      {thumbnailSrc && (
        <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
          <img
            src={thumbnailSrc}
            alt="Content preview"
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Platform badge */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="flex items-center gap-1">
          {getPlatformIcon(placement)}
          <span>{getPlatformName(placement)}</span>
        </Badge>
        <Badge variant="success">Published</Badge>
      </div>

      {/* Caption */}
      {message && (
        <Text size="sm" className="line-clamp-4">
          {message}
        </Text>
      )}

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-2">
        {POPOVER_METRICS.map(({ key, label, icon }) => (
          <div
            key={key}
            className="flex items-center gap-1.5 text-muted-foreground"
          >
            {icon}
            <span className="text-xs">
              {formatMetric(metrics[key])} {label.toLowerCase()}
            </span>
          </div>
        ))}
      </div>

      {refreshLabel && (
        <Caption tone="muted" className="text-xs">
          {refreshLabel}
        </Caption>
      )}

      {/* View live post link */}
      {permalinkUrl && (
        <a
          href={permalinkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3 w-3" />
          View live post
        </a>
      )}
    </div>
  );
}
