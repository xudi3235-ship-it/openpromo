import {
  FacebookFeedPreview,
  type PreviewData,
  type PreviewMediaItem,
} from "@openpromo/ui/components/social-preview";
import { useAttachmentRenderer } from "@/hooks/useAttachmentRenderer";
import { useComposerPreview } from "@/stores/composer-preview-store";

interface FBFeedPreviewProps {
  accountId?: string;
  size?: "thumbnail" | "compact" | "default" | "large";
}

export function FBFeedPreview({
  accountId,
  size = "default",
}: FBFeedPreviewProps) {
  const previewData = useComposerPreview({
    platform: "FACEBOOK",
    accountId,
  });

  const { renderAttachment } = useAttachmentRenderer({
    attachments: previewData.attachments ?? [],
  });

  if (previewData.placement !== "FB_FEED") {
    return null;
  }

  // Transform composer preview data to the new format
  // Use index-based matching to support blob previews (files without URLs yet)
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

  return (
    <FacebookFeedPreview
      data={transformedData}
      size={size}
      renderMedia={(media: PreviewMediaItem, className: string) => {
        // Match by index to support uploading files (blobs) without URLs
        const mediaIndex = transformedData.media?.findIndex(
          (m) => m.url === media.url,
        );
        if (mediaIndex === undefined || mediaIndex === -1) return null;

        const attachment = previewData.attachments?.[mediaIndex];
        if (!attachment) return null;

        return renderAttachment(attachment, className, true);
      }}
    />
  );
}
