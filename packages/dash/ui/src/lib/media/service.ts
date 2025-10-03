/** biome-ignore-all lint/complexity/noStaticOnlyClass: lib */

import type { SharedAttachmentSpec } from "@shared/content";
import { uploadAttachments as uploadAttachmentsService } from "@/services/attachment-upload";
import { MediaItemFactory } from "./factory";
import type { MediaItem } from "./types";

// Unified media service for all media operations
export class MediaService {
  // Convert files to media items
  static fromFiles(files: File[]): MediaItem[] {
    return files.map(MediaItemFactory.fromFile);
  }

  // Convert attachment specs to media items
  static fromAttachments(attachments: SharedAttachmentSpec[]): MediaItem[] {
    return attachments.map(MediaItemFactory.fromAttachment);
  }

  // Upload media items
  static async uploadMediaItems(
    items: MediaItem[],
    workspaceSlug: string,
    _onProgress?: (itemId: string, progress: number) => void,
    onComplete?: (itemId: string, result: MediaItem) => void,
    onError?: (itemId: string, error: string) => void,
  ): Promise<MediaItem[]> {
    // Filter only local items that can be uploaded
    const uploadableItems = items.filter(
      (item) => item.state === "local" && item.file,
    );

    if (uploadableItems.length === 0) {
      return items;
    }

    try {
      // biome-ignore lint/style/noNonNullAssertion: lib
      const files = uploadableItems.map((item) => item.file!);

      // Use existing upload service
      const results = await uploadAttachmentsService(
        files,
        workspaceSlug,
        0, // startingIndex
      );

      // Process results and update media items
      const updatedItems = [...items];

      results.forEach((result, index) => {
        const originalItem = uploadableItems[index];
        const originalIndex = items.findIndex(
          (item) => item.id === originalItem.id,
        );

        if (originalIndex === -1) return;

        if ("error" in result) {
          // Handle error
          updatedItems[originalIndex] = {
            ...originalItem,
            state: "failed",
            error: result.error.message,
          };
          onError?.(originalItem.id, result.error.message);
        } else {
          // Handle success
          const updatedItem = MediaItemFactory.fromUploadResult(
            result,
            originalItem,
          );
          updatedItems[originalIndex] = updatedItem;
          onComplete?.(originalItem.id, updatedItem);
        }
      });

      return updatedItems;
    } catch (error) {
      // Handle upload service errors
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";

      return items.map((item) => {
        if (uploadableItems.some((ui) => ui.id === item.id)) {
          onError?.(item.id, errorMessage);
          return { ...item, state: "failed" as const, error: errorMessage };
        }
        return item;
      });
    }
  }

  // Convert media items back to attachment specs for compatibility
  static toAttachmentSpecs(items: MediaItem[]): SharedAttachmentSpec[] {
    return items.map(MediaItemFactory.toAttachmentSpec);
  }

  // Convert single media item to attachment spec
  static toAttachmentSpec(item: MediaItem): SharedAttachmentSpec {
    return MediaItemFactory.toAttachmentSpec(item);
  }

  // Get thumbnail URL for a media item (for placement specs)
  static getThumbnailUrl(item: MediaItem): string | null {
    // Priority: thumbnail -> preview -> public URL
    return item.urls.thumbnail || item.urls.preview || item.urls.public || null;
  }

  // Get first available thumbnail from a list of media items
  static getFirstThumbnail(items: MediaItem[]): string | null;
  // Overload for SharedAttachmentSpec compatibility
  static getFirstThumbnail(items: SharedAttachmentSpec[]): string | null;
  static getFirstThumbnail(
    items: MediaItem[] | SharedAttachmentSpec[],
  ): string | null {
    // Check if we have SharedAttachmentSpec by checking the structure
    if (items.length > 0 && "type" in items[0] && !("state" in items[0])) {
      // Handle SharedAttachmentSpec arrays
      const attachmentSpecs = items as SharedAttachmentSpec[];
      for (const att of attachmentSpecs) {
        if (att.type === "photo" && att.publicUrl) return att.publicUrl;
        if (att.type === "video" && att.metadata?.thumbnailUrl) {
          return att.metadata.thumbnailUrl as string;
        }
      }
      return null;
    }

    // Handle MediaItem arrays
    const mediaItems = items as MediaItem[];
    for (const item of mediaItems) {
      const thumbnail = MediaService.getThumbnailUrl(item);
      if (thumbnail) return thumbnail;
    }
    return null;
  }

  // Reorder media items
  static reorderItems(
    items: MediaItem[],
    fromIndex: number,
    toIndex: number,
  ): MediaItem[] {
    const newItems = [...items];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);
    return newItems;
  }

  // Remove media item
  static removeItem(items: MediaItem[], index: number): MediaItem[] {
    const newItems = [...items];
    const removedItem = newItems[index];

    // Clean up blob URLs
    if (removedItem?.urls.preview.startsWith("blob:")) {
      URL.revokeObjectURL(removedItem.urls.preview);
    }

    newItems.splice(index, 1);
    return newItems;
  }

  // Validate files before creating media items
  static validateFiles(
    files: File[],
    config: {
      maxFiles?: number;
      maxImageSize?: number;
      maxVideoSize?: number;
      allowedTypes?: string[];
    } = {},
  ): { validFiles: File[]; errors: string[] } {
    const {
      maxFiles = 10,
      maxImageSize = 10 * 1024 * 1024, // 10MB
      maxVideoSize = 100 * 1024 * 1024, // 100MB
      allowedTypes = ["image/*", "video/*"],
    } = config;

    const validFiles: File[] = [];
    const errors: string[] = [];

    if (files.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed`);
      return { validFiles: [], errors };
    }

    for (const file of files) {
      // Check file type
      const isAllowed = allowedTypes.some((type) => {
        if (type.endsWith("*")) {
          return file.type.startsWith(type.slice(0, -1));
        }
        return file.type === type;
      });

      if (!isAllowed) {
        errors.push(`File type ${file.type} not allowed for ${file.name}`);
        continue;
      }

      // Check file size
      const isVideo = file.type.startsWith("video/");
      const maxSize = isVideo ? maxVideoSize : maxImageSize;

      if (file.size > maxSize) {
        const maxSizeMB = maxSize / (1024 * 1024);
        errors.push(`${file.name} exceeds ${maxSizeMB}MB limit`);
        continue;
      }

      validFiles.push(file);
    }

    return { validFiles, errors };
  }
}
