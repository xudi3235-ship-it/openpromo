import { Badge } from "@openpromo/ui/components/badge";
import type { SharedAttachmentSpec } from "@shared/content";
import { useMemo } from "react";
import { PreviewMediaNullState } from "@/components/composer/preview/null-state";
import { useAttachmentRenderer } from "@/hooks/useAttachmentRenderer";

type SupportedPlatform = "FACEBOOK" | "INSTAGRAM" | "TIKTOK";

interface InboxPostPreviewProps {
  platform: SupportedPlatform;
  mediaUrl?: string;
  mediaThumbnailUrl?: string;
  mediaType?: string | null;
  caption?: string | null;
  permalink?: string | null;
}

export function InboxPostPreview({
  platform,
  mediaUrl,
  mediaThumbnailUrl,
  mediaType,
  caption,
  permalink,
}: InboxPostPreviewProps) {
  const attachments = useMemo(() => {
    if (!mediaUrl) return [] as SharedAttachmentSpec[];
    const normalizedType = (mediaType ?? "").toUpperCase();
    const isVideo = normalizedType.includes("VIDEO");
    return [
      {
        id: "inbox-post-preview",
        type: isVideo ? "video" : "photo",
        publicUrl: mediaUrl,
        thumbnailUrl: mediaThumbnailUrl ?? mediaUrl,
      } satisfies SharedAttachmentSpec,
    ];
  }, [mediaUrl, mediaThumbnailUrl, mediaType]);

  const { renderAttachment } = useAttachmentRenderer({ attachments });
  const hasMedia = attachments.length > 0;
  const preview = hasMedia
    ? renderAttachment(
        attachments[0],
        "h-48 w-full rounded-lg object-cover",
        false,
      )
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Original Post</span>
        <Badge variant="outline" className="capitalize">
          {platform.toLowerCase()}
        </Badge>
      </div>
      <div className="overflow-hidden rounded-lg border border-border/60 bg-background">
        {preview ?? (
          <div className="h-48 flex items-center justify-center bg-muted/40">
            <PreviewMediaNullState message="No media available" />
          </div>
        )}
      </div>
      {caption ? (
        <p className="text-sm leading-relaxed text-foreground">{caption}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {mediaType ? (
          <Badge variant="secondary" className="capitalize">
            {mediaType.toLowerCase()}
          </Badge>
        ) : null}
        {permalink ? (
          <a
            href={permalink}
            target="_blank"
            rel="noreferrer"
            className="text-primary"
          >
            View post
          </a>
        ) : null}
      </div>
    </div>
  );
}
