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
  const transformedData: PreviewData = {
    accountName: previewData.accountName,
    profilePicUrl: previewData.profilePicUrl,
    caption: previewData.caption,
    media: (previewData.attachments ?? []).map((att) => ({
      type: att.type === "video" ? "video" : "photo",
      url: att.presignedUrl || att.publicUrl || "",
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
        // Find the matching attachment
        const attachment = previewData.attachments?.find(
          (att) =>
            att.presignedUrl === media.url || att.publicUrl === media.url,
        );
        if (!attachment) return null;
        return renderAttachment(attachment, className, true);
      }}
    />
  );
}
