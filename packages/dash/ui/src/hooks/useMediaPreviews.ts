import type { SharedAttachmentSpec } from "@core/schemas/content.sql";
import { useCallback, useEffect, useRef, useState } from "react";

export interface MediaPreview {
  file: File; // may be an empty placeholder for remote assets
  url: string;
  aspectRatio: string;
  mimeType: string;
  previewIframeUrl?: string; // For Cloudflare Stream videos
  isStreamVideo?: boolean; // Flag to identify stream videos
}

const generatePreview = async (
  file: File,
  attachment: SharedAttachmentSpec,
): Promise<MediaPreview> => {
  const previewIframeUrl = attachment.metadata?.previewIframeUrl as
    | string
    | undefined;
  const thumbnailUrl = attachment.metadata?.thumbnailUrl as string | undefined;

  return new Promise((resolve) => {
    if (file.type.startsWith("image/")) {
      // For images, use publicUrl if available, otherwise create blob URL
      const imageUrl = attachment.publicUrl || URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const aspectRatio = `${img.width}:${img.height}`;
        resolve({
          file,
          url: imageUrl,
          aspectRatio,
          mimeType: file.type,
          previewIframeUrl,
          isStreamVideo: false,
        });
      };
      img.onerror = () => {
        // Fallback for broken images
        resolve({
          file,
          url: imageUrl,
          aspectRatio: "1:1",
          mimeType: file.type,
          previewIframeUrl,
          isStreamVideo: false,
        });
      };
      img.src = imageUrl;
    } else if (file.type.startsWith("video/")) {
      // For videos: prefer local file if it exists and has content, otherwise use stream
      if (file.size > 0 && !previewIframeUrl) {
        // Use local preview for files that haven't been uploaded yet
        const video = document.createElement("video");
        video.onloadedmetadata = () => {
          const aspectRatio = `${video.videoWidth}:${video.videoHeight}`;
          resolve({
            file,
            url: URL.createObjectURL(file),
            aspectRatio,
            mimeType: file.type,
            previewIframeUrl,
            isStreamVideo: false,
          });
        };
        video.onerror = () => {
          // Fallback for broken local video
          resolve({
            file,
            url: URL.createObjectURL(file),
            aspectRatio: "16:9",
            mimeType: file.type,
            previewIframeUrl,
            isStreamVideo: false,
          });
        };
        video.src = URL.createObjectURL(file);
      } else if (previewIframeUrl) {
        // Use stream preview for uploaded videos
        const previewUrl =
          thumbnailUrl || attachment.publicUrl || URL.createObjectURL(file);
        resolve({
          file,
          url: previewUrl,
          aspectRatio: "16:9",
          mimeType: file.type,
          previewIframeUrl,
          isStreamVideo: true,
        });
      } else {
        // Fallback for videos without stream info
        const videoUrl = attachment.publicUrl || URL.createObjectURL(file);
        resolve({
          file,
          url: videoUrl,
          aspectRatio: "16:9",
          mimeType: file.type,
          previewIframeUrl,
          isStreamVideo: false,
        });
      }
    } else {
      // Fallback for unknown file types
      const fileUrl = attachment.publicUrl || URL.createObjectURL(file);
      resolve({
        file,
        url: fileUrl,
        aspectRatio: "Unknown",
        mimeType: file.type,
        previewIframeUrl,
        isStreamVideo: false,
      });
    }
  });
};

export function useMediaPreviews(attachments?: SharedAttachmentSpec[]) {
  const [previews, setPreviews] = useState<MediaPreview[]>([]);
  const previewCacheRef = useRef(new Map<File, MediaPreview>());

  // Memoized preview generator that reuses existing previews
  const generatePreviewsForAttachments = useCallback(
    async (attachments: SharedAttachmentSpec[]) => {
      if (!attachments?.length) return [];

      const generated: MediaPreview[] = [];

      for (const att of attachments) {
        if (att.file) {
          // Check cache first
          const cached = previewCacheRef.current.get(att.file);
          if (cached) {
            generated.push(cached);
          } else {
            // Generate new preview and cache it
            const newPreview = await generatePreview(att.file, att);
            previewCacheRef.current.set(att.file, newPreview);
            generated.push(newPreview);
          }
        } else if (att.publicUrl) {
          // For existing attachments without file (edit mode), use publicUrl directly
          // Create a minimal placeholder file object with the required properties
          const placeholderFile = {
            name: att.id || "unknown",
            size: 0,
            type: att.mimeType || "image/jpeg",
            lastModified: Date.now(),
          } as File;

          const previewIframeUrl = att.metadata?.previewIframeUrl as
            | string
            | undefined;
          const thumbnailUrl = att.metadata?.thumbnailUrl as string | undefined;
          const isVideo = att.type === "video";

          // For videos with stream iframe, use thumbnail for preview but mark as stream video
          const previewUrl =
            isVideo && thumbnailUrl ? thumbnailUrl : att.publicUrl;

          generated.push({
            file: placeholderFile,
            url: previewUrl,
            aspectRatio: isVideo ? "16:9" : "Unknown",
            mimeType: att.mimeType || "image/jpeg",
            previewIframeUrl,
            isStreamVideo: isVideo && !!previewIframeUrl,
          });
        }
      }

      return generated;
    },
    [],
  );

  // Helper function to generate stable keys
  const getStableKey = useCallback(
    (preview: MediaPreview, index: number): string => {
      const att = attachments?.[index];
      return (
        att?.id ||
        `${preview.file.name}-${preview.file.size}-${preview.file.lastModified}`
      );
    },
    [attachments],
  );

  // Update previews when attachments change - optimized to reduce flickering
  useEffect(() => {
    let cancelled = false;

    const updatePreviews = async () => {
      if (!attachments?.length) {
        setPreviews((currentPreviews) => {
          currentPreviews.forEach((p) => {
            if (p.url.startsWith("blob:")) {
              URL.revokeObjectURL(p.url);
            }
          });
          previewCacheRef.current.clear();
          return [];
        });
        return;
      }

      const newPreviews = await generatePreviewsForAttachments(attachments);

      if (!cancelled) {
        setPreviews((currentPreviews) => {
          // Clean up URLs for previews that are no longer needed
          const currentFiles = new Set(newPreviews.map((p) => p.file));
          currentPreviews.forEach((p) => {
            if (!currentFiles.has(p.file) && p.url.startsWith("blob:")) {
              URL.revokeObjectURL(p.url);
              previewCacheRef.current.delete(p.file);
            }
          });

          return newPreviews;
        });
      }
    };

    updatePreviews();

    return () => {
      cancelled = true;
    };
  }, [attachments, generatePreviewsForAttachments]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      setPreviews((currentPreviews) => {
        currentPreviews.forEach((p) => {
          if (p.url.startsWith("blob:")) {
            URL.revokeObjectURL(p.url);
          }
        });
        return currentPreviews;
      });
    };
  }, []);

  return {
    previews,
    getStableKey,
  };
}
