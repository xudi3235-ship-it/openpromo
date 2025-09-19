import type { SharedAttachmentSpec } from "@core/schemas/content.sql";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { StreamVideoPreview } from "@/components/composer/stream-video-preview";

interface AttachmentRendererOptions {
  attachments?: SharedAttachmentSpec[];
}

type CacheEntry = {
  url: string;
  isObjectUrl: boolean;
};

type CacheKey = string;

const fileKeyCache = new WeakMap<File, CacheKey>();

const createFileKey = (file: File): CacheKey => {
  const existing = fileKeyCache.get(file);
  if (existing) return existing;

  const key = `file:${file.name}:${file.size}:${file.lastModified}`;
  fileKeyCache.set(file, key);
  return key;
};

const getCacheKey = (attachment: SharedAttachmentSpec): CacheKey | null => {
  if (attachment.id) return `id:${attachment.id}`;
  if (attachment.s3Key) return `s3:${attachment.s3Key}`;
  if (attachment.file) return createFileKey(attachment.file);
  if (attachment.publicUrl) return `public:${attachment.publicUrl}`;
  if (attachment.thumbnailUrl) return `thumb:${attachment.thumbnailUrl}`;
  const previewIframeUrl = attachment.metadata?.previewIframeUrl as
    | string
    | undefined;
  if (previewIframeUrl) return `stream:${previewIframeUrl}`;
  return null;
};

export function useAttachmentRenderer(options: AttachmentRendererOptions = {}) {
  const { attachments } = options;

  const cacheRef = useRef<Map<CacheKey, CacheEntry>>(new Map());

  const cleanupCacheEntries = useCallback((activeKeys: Set<CacheKey>) => {
    const cache = cacheRef.current;
    for (const [key, entry] of cache.entries()) {
      if (!activeKeys.has(key)) {
        if (entry.isObjectUrl) {
          URL.revokeObjectURL(entry.url);
        }
        cache.delete(key);
      }
    }
  }, []);

  useEffect(() => {
    if (!attachments) {
      return;
    }

    const activeKeys = new Set<CacheKey>();
    for (const attachment of attachments) {
      const key = getCacheKey(attachment);
      if (key) {
        activeKeys.add(key);
      }
    }

    cleanupCacheEntries(activeKeys);
  }, [attachments, cleanupCacheEntries]);

  useEffect(() => {
    return () => {
      cleanupCacheEntries(new Set());
    };
  }, [cleanupCacheEntries]);

  const getAttachmentUrl = useCallback(
    (attachment: SharedAttachmentSpec): string | null => {
      if (attachment.file) {
        const cacheKey = getCacheKey(attachment);
        if (!cacheKey) return null;

        const cached = cacheRef.current.get(cacheKey);
        if (cached) {
          return cached.url;
        }

        const objectUrl = URL.createObjectURL(attachment.file);
        cacheRef.current.set(cacheKey, {
          url: objectUrl,
          isObjectUrl: true,
        });
        return objectUrl;
      }

      if (attachment.publicUrl) {
        return attachment.publicUrl;
      }

      if (attachment.thumbnailUrl) {
        return attachment.thumbnailUrl;
      }

      return null;
    },
    [],
  );

  const renderAttachment = useCallback(
    (
      attachment: SharedAttachmentSpec,
      className: string = "w-full h-full object-cover",
      controls = false,
    ) => {
      const url = getAttachmentUrl(attachment);

      if (attachment.type === "photo") {
        if (!url) return null;
        return <img src={url} alt="Preview" className={className} />;
      }

      if (attachment.type === "video") {
        const previewIframeUrl = attachment.metadata?.previewIframeUrl as
          | string
          | undefined;

        if (previewIframeUrl && !attachment.file) {
          return (
            <StreamVideoPreview
              iframeUrl={previewIframeUrl}
              className={className}
              aspectRatio="16:9"
              autoplay={true}
              controls={controls}
              loop={true}
              muted={!controls}
            />
          );
        }

        if (!url) return null;

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

      return null;
    },
    [getAttachmentUrl],
  );

  return useMemo(
    () => ({
      getAttachmentUrl,
      renderAttachment,
    }),
    [getAttachmentUrl, renderAttachment],
  );
}
