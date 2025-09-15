import type { SharedAttachmentSpec } from "@core/schemas/content.sql";
import { useCallback, useEffect, useState } from "react";
import { type MediaItem, MediaService } from "@/lib/media";

interface UseUnifiedMediaOptions {
  initialAttachments?: SharedAttachmentSpec[];
  workspaceSlug?: string;
  onUploadProgress?: (itemId: string, progress: number) => void;
  onUploadComplete?: (itemId: string, item: MediaItem) => void;
  onUploadError?: (itemId: string, error: string) => void;
  onItemsChange?: (items: MediaItem[]) => void;
}

export function useUnifiedMedia(options: UseUnifiedMediaOptions = {}) {
  const {
    initialAttachments = [],
    workspaceSlug,
    onUploadProgress,
    onUploadComplete,
    onUploadError,
    onItemsChange,
  } = options;

  // Convert initial attachments to media items
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(() =>
    MediaService.fromAttachments(initialAttachments),
  );

  // Notify parent of changes
  useEffect(() => {
    onItemsChange?.(mediaItems);
  }, [mediaItems, onItemsChange]);

  // Add files as new media items
  const addFiles = useCallback(
    async (files: File[]) => {
      // Validate files
      const { validFiles, errors } = MediaService.validateFiles(files);

      if (errors.length > 0) {
        console.error("File validation errors:", errors);
        // Could emit errors to parent component
        return { success: false, errors };
      }

      // Create media items from valid files
      const newItems = MediaService.fromFiles(validFiles);
      setMediaItems((prev) => [...prev, ...newItems]);

      // Upload if workspace is available
      if (workspaceSlug && validFiles.length > 0) {
        try {
          const updatedItems = await MediaService.uploadMediaItems(
            [...mediaItems, ...newItems],
            workspaceSlug,
            onUploadProgress,
            (itemId, item) => {
              setMediaItems((prev) =>
                prev.map((existing) =>
                  existing.id === itemId ? item : existing,
                ),
              );
              onUploadComplete?.(itemId, item);
            },
            onUploadError,
          );
          setMediaItems(updatedItems);
        } catch (error) {
          console.error("Upload failed:", error);
        }
      }

      return { success: true, errors: [] };
    },
    [
      mediaItems,
      workspaceSlug,
      onUploadProgress,
      onUploadComplete,
      onUploadError,
    ],
  );

  // Remove item by index
  const removeItem = useCallback((index: number) => {
    setMediaItems((prev) => MediaService.removeItem(prev, index));
  }, []);

  // Reorder items
  const reorderItems = useCallback((fromIndex: number, toIndex: number) => {
    setMediaItems((prev) =>
      MediaService.reorderItems(prev, fromIndex, toIndex),
    );
  }, []);

  // Get attachment specs for compatibility with existing code
  const getAttachmentSpecs = useCallback((): SharedAttachmentSpec[] => {
    return MediaService.toAttachmentSpecs(mediaItems);
  }, [mediaItems]);

  // Get first thumbnail for placement specs
  const getFirstThumbnail = useCallback((): string | null => {
    return MediaService.getFirstThumbnail(mediaItems);
  }, [mediaItems]);

  // Sync from external attachment changes (for compatibility)
  const syncFromAttachments = useCallback(
    (attachments: SharedAttachmentSpec[]) => {
      setMediaItems(MediaService.fromAttachments(attachments));
    },
    [],
  );

  return {
    // State
    mediaItems,
    attachmentSpecs: getAttachmentSpecs(),
    firstThumbnail: getFirstThumbnail(),

    // Actions
    addFiles,
    removeItem,
    reorderItems,

    // Compatibility
    syncFromAttachments,
    getAttachmentSpecs,
  };
}
