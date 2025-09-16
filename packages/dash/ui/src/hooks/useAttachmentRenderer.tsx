import type { SharedAttachmentSpec } from "@core/schemas/content.sql";
import { StreamVideoPreview } from "@/components/composer/stream-video-preview";

export function useAttachmentRenderer() {
  // Helper function to get the preview URL for an attachment
  const getAttachmentUrl = (
    attachment: SharedAttachmentSpec,
  ): string | null => {
    if (attachment.file) {
      return URL.createObjectURL(attachment.file);
    }
    if (attachment.publicUrl) {
      return attachment.publicUrl;
    }
    return null;
  };

  // Helper to render a single attachment
  const renderAttachment = (
    attachment: SharedAttachmentSpec,
    className: string = "w-full h-full object-cover",
    controls: boolean = false,
  ) => {
    const url = getAttachmentUrl(attachment);
    if (!url) return null;

    if (attachment.type === "photo") {
      return <img src={url} alt="Preview" className={className} />;
    }

    if (attachment.type === "video") {
      // Check if we have a stream iframe URL in metadata
      const previewIframeUrl = attachment.metadata?.previewIframeUrl as
        | string
        | undefined;

      if (previewIframeUrl && !attachment.file) {
        // Use stream preview for uploaded videos without local file
        return (
          <StreamVideoPreview
            iframeUrl={previewIframeUrl}
            className={className}
            aspectRatio="16:9"
          />
        );
      } else {
        // Use local video preview
        return (
          <video
            src={url}
            className={className}
            controls={controls}
            muted={!controls}
            autoPlay
            loop
            playsInline
          >
            <track kind="captions" label="auto-generated" />
          </video>
        );
      }
    }

    return null;
  };

  return {
    getAttachmentUrl,
    renderAttachment,
  };
}
