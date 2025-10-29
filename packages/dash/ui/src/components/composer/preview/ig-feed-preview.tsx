import { useComposerPreview } from "@/stores/composer-preview-store";
import { InstagramFeedCard } from "./post-preview-card";

interface IGFeedPreviewProps {
  accountId?: string;
}

export function IGFeedPreview({ accountId }: IGFeedPreviewProps) {
  const previewData = useComposerPreview({
    platform: "INSTAGRAM",
    accountId,
  });

  if (previewData.placement !== "IG_FEED") {
    return null;
  }

  return (
    <InstagramFeedCard
      platform="INSTAGRAM"
      accountName={previewData.accountName}
      profilePicUrl={previewData.profilePicUrl}
      caption={previewData.caption}
      attachments={previewData.attachments}
      location={previewData.location}
      likesCount={previewData.metrics?.likes ?? null}
      timestampLabel={previewData.timestampLabel}
    />
  );
}
