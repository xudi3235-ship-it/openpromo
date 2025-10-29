import { useWorkspace } from "@/hooks/useWorkspace";
import { useComposerPreview } from "@/stores/composer-preview-store";
import { InstagramFeedCard } from "./post-preview-card";

interface IGFeedPreviewProps {
  accountId?: string;
}

export function IGFeedPreview({ accountId }: IGFeedPreviewProps) {
  const { workspace } = useWorkspace();
  const previewData = useComposerPreview({
    platform: "INSTAGRAM",
    accountId,
  });
  return (
    <InstagramFeedCard
      platform="INSTAGRAM"
      accountName={previewData.getInstagramUsername(workspace?.name)}
      profilePicUrl={previewData.profilePicUrl}
      caption={previewData.message}
      attachments={previewData.attachments}
      location="San Francisco, California"
      likesCount={1247}
      timestampLabel="2 hours ago"
    />
  );
}
