import type { UnifiedContentSelect } from "@core/schemas/content.sql";
import { Badge } from "@openpromo/ui/components/badge";
import { Text } from "@openpromo/ui/components/typography";
import type { AllPlacement, ContentPublishingStatus } from "@shared/content";
import { format } from "date-fns";
import { FBFeedPreview } from "@/components/composer/preview/fb-feed-preview";
import { FBReelPreview } from "@/components/composer/preview/fb-reel-preview";
import { IGFeedPreview } from "@/components/composer/preview/ig-feed-preview";
import { IGReelPreview } from "@/components/composer/preview/ig-reel-preview";
import { TikTokPreview } from "@/components/composer/preview/tiktok-preview";
import {
  getPlatformIcon,
  getPlatformName,
} from "@/components/content/utils/platform-icons";
import { useInitializeComposerPreview } from "@/hooks/useInitializeComposerPreview";

type BadgeTone =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "success"
  | "warning"
  | "announcement"
  | "announcement-pill";

const statusBadgeVariant: Record<ContentPublishingStatus, BadgeTone> = {
  DRAFT: "secondary",
  SCHEDULED: "warning",
  PUBLISHED: "success",
  FAILED_TO_PUBLISH: "destructive",
  PUBLISH_NOW: "default",
};

const statusLabels: Record<ContentPublishingStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  PUBLISHED: "Published",
  FAILED_TO_PUBLISH: "Failed to publish",
  PUBLISH_NOW: "Publish now",
};

type ContentDetailHeaderProps = {
  content: UnifiedContentSelect;
  connectedAccountId: string;
};

function isReelContent(content: UnifiedContentSelect) {
  const attachments = content.placementSpec.attachments ?? [];
  return attachments.length === 1 && attachments[0]?.type === "video";
}

function getPlatformFromPlacement(placement: AllPlacement) {
  return placement.split("_")[0] as "FB" | "IG" | "TT";
}

export function ContentDetailHeader({
  content,
  connectedAccountId,
}: ContentDetailHeaderProps) {
  const publishAt = content.placementSpec.schedulingSpec?.publishAt;
  const isReel = isReelContent(content);
  const platformPrefix = getPlatformFromPlacement(content.placement);

  // Initialize composer with content data for preview rendering
  useInitializeComposerPreview(content, connectedAccountId);

  const renderPreview = () => {
    switch (platformPrefix) {
      case "FB":
        return isReel ? (
          <FBReelPreview accountId={connectedAccountId} />
        ) : (
          <FBFeedPreview accountId={connectedAccountId} />
        );
      case "IG":
        return isReel ? (
          <IGReelPreview accountId={connectedAccountId} />
        ) : (
          <IGFeedPreview accountId={connectedAccountId} />
        );
      case "TT":
        return <TikTokPreview accountId={connectedAccountId} />;
      default:
        return (
          <div className="text-muted-foreground text-sm">
            Preview unavailable
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Preview Section */}
      <div className="flex justify-center">{renderPreview()}</div>

      {/* Minimal Info: Status, Date, Platform */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <Badge variant={statusBadgeVariant[content.publishingStatus]}>
            {statusLabels[content.publishingStatus]}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            {getPlatformIcon(content.placement)}
            <span>{getPlatformName(content.placement)}</span>
          </Badge>
        </div>
        <Text tone="muted" size="sm">
          {publishAt
            ? `Scheduled for ${format(publishAt, "MMM d")}`
            : `Posted ${format(content.createdAt ?? new Date(), "MMM d")}`}
        </Text>
      </div>
    </div>
  );
}
