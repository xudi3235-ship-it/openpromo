import type { SharedAttachmentSpec } from "@core/schemas/content.sql";
import { useCallback, useEffect, useRef, useState } from "react";

export interface MediaPreview {
  file: File; // may be an empty placeholder for remote assets
  url: string;
  aspectRatio: string;
  mimeType: string;
}

const generatePreview = async (
  file: File,
  publicUrl?: string,
): Promise<MediaPreview> => {
  // Use public URL if available, otherwise create blob URL
  const url = publicUrl || URL.createObjectURL(file);

  return new Promise((resolve) => {
    if (file.type.startsWith("image/")) {
      const img = new Image();
      img.onload = () => {
        const aspectRatio = `${img.width}:${img.height}`;
        resolve({ file, url, aspectRatio, mimeType: file.type });
      };
      img.src = url;
    } else if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.onloadedmetadata = () => {
        const aspectRatio = `${video.videoWidth}:${video.videoHeight}`;
        resolve({ file, url, aspectRatio, mimeType: file.type });
      };
      video.src = url;
    } else {
      resolve({ file, url, aspectRatio: "Unknown", mimeType: file.type });
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
            // Generate new preview and cache it, using publicUrl if available
            const newPreview = await generatePreview(att.file, att.publicUrl);
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

          generated.push({
            file: placeholderFile,
            url: att.publicUrl,
            aspectRatio: "Unknown", // Could be enhanced to fetch dimensions
            mimeType: att.mimeType || "image/jpeg",
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
