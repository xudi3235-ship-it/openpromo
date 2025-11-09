import {
  FacebookReelPreview,
  type PreviewData,
  type PreviewMediaItem,
} from "@openpromo/ui/components/social-preview";
import { useAttachmentRenderer } from "@/hooks/useAttachmentRenderer";
import { useComposerPreview } from "@/stores/composer-preview-store";
import { CTA_OPTIONS } from "../types/platform-features";

interface FBReelPreviewProps {
  accountId?: string;
  size?: "thumbnail" | "compact" | "default" | "large";
}

export function FBReelPreview({
  accountId,
  size = "default",
}: FBReelPreviewProps) {
  const previewData = useComposerPreview({
    platform: "FACEBOOK",
    accountId,
    placement: "REEL",
  });

  const { renderAttachment } = useAttachmentRenderer({
    attachments: previewData.attachments ?? [],
  });

  if (previewData.placement !== "FB_REEL") {
    return null;
  }

  // FB Reels can have CTA buttons
  const callToActionLabel = previewData.callToActionLabel;
  const callToActionLink = previewData.callToActionLink;
  const ctaOption = callToActionLabel
    ? CTA_OPTIONS.find(
        (opt) => opt.label.toLowerCase() === callToActionLabel.toLowerCase(),
      )
    : null;

  // Transform composer preview data to the new format
  const transformedData: PreviewData = {
    accountName: previewData.accountName,
    profilePicUrl: previewData.profilePicUrl,
    caption: previewData.caption,
    media: (previewData.attachments ?? []).map((att, index) => ({
      type: att.type === "video" ? "video" : "photo",
      url:
        att.presignedUrl ||
        att.publicUrl ||
        att.file?.name ||
        `attachment-${index}`,
      thumbnailUrl: att.thumbnailUrl,
    })),
    metrics: {
      likes: previewData.metrics?.likes ?? undefined,
      comments: previewData.metrics?.comments ?? undefined,
      shares: previewData.metrics?.shares ?? undefined,
    },
  };

  // Custom render function that uses the attachment renderer hook
  const renderMedia = (media: PreviewMediaItem, className?: string) => {
    // Find the index of this media item in the transformed data
    const mediaIndex = transformedData.media?.findIndex(
      (m) => m.url === media.url,
    );
    if (mediaIndex === -1 || mediaIndex === undefined) return null;

    // Get the corresponding attachment
    const attachment = previewData.attachments?.[mediaIndex];
    if (!attachment) return null;

    // Render using the attachment renderer with autoplay for videos
    return renderAttachment(attachment, className, true);
  };

  return (
    <FacebookReelPreview
      data={transformedData}
      size={size}
      renderMedia={renderMedia}
      callToActionLabel={ctaOption?.label}
      callToActionLink={callToActionLink ?? undefined}
      firstComment={previewData.firstComment ?? null}
    />
  );
}
