import type { PreviewMediaItem } from "@openpromo/ui/components/social-preview";
import { TikTokFeedPreview } from "@openpromo/ui/components/social-preview";
import { useAttachmentRenderer } from "@/hooks/useAttachmentRenderer";
import { useComposerPreview } from "@/stores/composer-preview-store";

interface TikTokPreviewProps {
  accountId?: string;
}

export function TikTokPreview({ accountId }: TikTokPreviewProps) {
  const previewData = useComposerPreview({
    platform: "TIKTOK",
    accountId,
  });
  const attachments = previewData.attachments ?? [];
  const { renderAttachment } = useAttachmentRenderer({ attachments });

  if (previewData.placement !== "TT_FEED") {
    return null;
  }

  // Transform composer preview data to the new format
  // Use index-based matching to support blob previews (files without URLs yet)
  const transformedData = {
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
    metrics: previewData.metrics
      ? {
          likes: previewData.metrics.likes ?? undefined,
          comments: previewData.metrics.comments ?? undefined,
          shares: previewData.metrics.shares ?? undefined,
        }
      : undefined,
    firstComment: previewData.firstComment,
  } satisfies Parameters<typeof TikTokFeedPreview>[0]["data"];

  return (
    <TikTokFeedPreview
      data={transformedData}
      renderMedia={(media: PreviewMediaItem, className: string) => {
        // Match by index to support uploading files (blobs) without URLs
        const mediaIndex = transformedData.media?.findIndex(
          (m) => m.url === media.url,
        );
        if (mediaIndex === undefined || mediaIndex === -1) return null;

        const attachment = previewData.attachments?.[mediaIndex];
        if (!attachment) return null;

        return renderAttachment(attachment, className, true, {
          showMuteButton: true,
          size: "default",
        });
      }}
    />
  );
}
