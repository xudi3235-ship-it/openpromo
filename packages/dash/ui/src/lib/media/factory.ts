import type { SharedAttachmentSpec } from "@core/schemas/content.sql";
import type {
  ImageUploadResult,
  UploadResult,
  VideoUploadResult,
} from "@/services/attachment-upload";
import type { MediaItem, MediaType } from "./types";

// Utility functions
function getMediaType(mimeType: string): MediaType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "unknown";
}

function generateId(): string {
  return `media-${Date.now()}-${Math.random().toString(36).substring(2)}`;
}

// Factory implementation
export const MediaItemFactory = {
  fromFile: (file: File): MediaItem => {
    const type = getMediaType(file.type);
    const previewUrl = URL.createObjectURL(file);

    return {
      id: generateId(),
      type,
      mimeType: file.type,
      file,
      state: "local",
      urls: {
        preview: previewUrl,
      },
      fileSize: file.size,
    };
  },

  fromAttachment: (attachment: SharedAttachmentSpec): MediaItem => {
    const type = getMediaType(attachment.mimeType || "");
    const state = attachment.publicUrl ? "uploaded" : "local";

    // Extract metadata
    const metadata = (attachment.metadata as Record<string, unknown>) || {};
    const uploading = metadata.uploading as boolean;
    const error = metadata.error as string;
    const previewIframeUrl = metadata.previewIframeUrl as string;
    const thumbnailUrl = metadata.thumbnailUrl as string;

    // Determine URLs based on type and state
    let urls: MediaItem["urls"];

    if (type === "video" && state === "uploaded" && previewIframeUrl) {
      // Uploaded video with stream URLs
      urls = {
        preview: thumbnailUrl || attachment.publicUrl || "",
        playback: previewIframeUrl,
        thumbnail: thumbnailUrl,
        public: attachment.publicUrl,
      };
    } else if (attachment.file) {
      // Local file
      urls = {
        preview: URL.createObjectURL(attachment.file),
      };
    } else {
      // Uploaded image or fallback
      urls = {
        preview: attachment.publicUrl || "",
        public: attachment.publicUrl,
      };
    }

    return {
      id: attachment.id || generateId(),
      type,
      mimeType: attachment.mimeType || attachment.file?.type || "",
      file: attachment.file,
      state: uploading ? "uploading" : error ? "failed" : state,
      urls,
      fileSize: attachment.file?.size,
      error,
    };
  },

  fromUploadResult: (
    result: UploadResult,
    originalItem: MediaItem,
  ): MediaItem => {
    if ("error" in result) {
      // Error result
      return {
        ...originalItem,
        state: "failed",
        error: result.error.message,
      };
    }

    if ("previewIframeUrl" in result) {
      // Video upload result
      const videoResult = result as VideoUploadResult;
      return {
        ...originalItem,
        id: videoResult.id,
        state: "uploaded",
        urls: {
          preview: videoResult.thumbnailUrl || videoResult.publicUrl,
          playback: videoResult.previewIframeUrl || undefined,
          thumbnail: videoResult.thumbnailUrl || undefined,
          public: videoResult.publicUrl,
        },
      };
    } else {
      // Image upload result
      const imageResult = result as ImageUploadResult;
      return {
        ...originalItem,
        id: imageResult.id,
        state: "uploaded",
        urls: {
          preview: imageResult.publicUrl || "",
          public: imageResult.publicUrl || undefined,
          thumbnail: imageResult.thumbnailUrl || undefined,
        },
      };
    }
  },

  // Helper to convert MediaItem back to SharedAttachmentSpec for compatibility
  toAttachmentSpec: (item: MediaItem): SharedAttachmentSpec => {
    const metadata: Record<string, unknown> = {};

    if (item.state === "uploading") {
      metadata.uploading = true;
    }

    if (item.error) {
      metadata.error = item.error;
    }

    if (item.urls.playback) {
      metadata.previewIframeUrl = item.urls.playback;
    }

    if (item.urls.thumbnail) {
      metadata.thumbnailUrl = item.urls.thumbnail;
    }

    // Map media type to SharedAttachmentSpec type
    const attachmentType =
      item.type === "image"
        ? "photo"
        : item.type === "video"
          ? "video"
          : "photo";

    return {
      id: item.id,
      type: attachmentType,
      mimeType: item.mimeType,
      file: item.file,
      publicUrl: item.urls.public,
      s3Key: item.id,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };
  },
};
