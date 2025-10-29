import type { ContentPreview } from "@shared/content/content-preview";
import { InstagramFeedCard } from "@/components/composer/preview/post-preview-card";

interface InboxContentPreviewProps {
  preview: ContentPreview;
}

export function InboxContentPreview({ preview }: InboxContentPreviewProps) {
  const { placement, ...rest } = preview;
  switch (placement) {
    case "IG_FEED": {
      return <InstagramFeedCard platform="INSTAGRAM" {...rest} />;
    }
    case "IG_REEL":
    case "FB_FEED":
    case "FB_REEL":
    case "TT_FEED":
      // TODO: Add other preview card types when needed
      return (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-center text-sm text-muted-foreground">
          Preview not yet available for {preview.placement}
        </div>
      );
    default:
      return null;
  }
}
