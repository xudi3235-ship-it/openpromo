import { Caption, Text } from "@openpromo/ui/components/typography";
import type { SharedAttachmentSpec } from "@shared/content";

const resolveAttachmentPreview = (attachment: SharedAttachmentSpec) =>
  attachment.thumbnailUrl ||
  attachment.publicUrl ||
  attachment.presignedUrl ||
  attachment.metadata?.previewUrl;

interface ContentDetailAttachmentsProps {
  attachments?: SharedAttachmentSpec[];
  firstComment?: string | null;
}

export function ContentDetailAttachments({
  attachments,
  firstComment,
}: ContentDetailAttachmentsProps) {
  const safeAttachments = attachments ?? [];
  const hasAttachments = safeAttachments.length > 0;

  if (!hasAttachments && !firstComment) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Comment Section */}
      {firstComment && (
        <div className="space-y-1">
          <Caption tone="muted" className="text-xs">
            First Comment
          </Caption>
          <Text size="sm" className="line-clamp-3">
            {firstComment}
          </Text>
        </div>
      )}

      {/* Assets Grid */}
      {hasAttachments && (
        <div className="space-y-2">
          <Caption tone="muted" className="text-xs">
            {safeAttachments.length} Asset
            {safeAttachments.length === 1 ? "" : "s"}
          </Caption>
          <div className="grid gap-2 grid-cols-3 md:grid-cols-4">
            {safeAttachments.map((attachment) => {
              const preview = resolveAttachmentPreview(attachment);
              return (
                <div
                  key={attachment.id}
                  className="relative aspect-square overflow-hidden rounded-lg bg-muted"
                >
                  {preview ? (
                    <img
                      src={preview}
                      alt="Asset"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      {attachment.type}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
