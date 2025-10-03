// Unified media types for consistent handling across the app

import type { SharedAttachmentSpec } from "@shared/content";
import type React from "react";
import type { UploadResult } from "@/services/attachment-upload";

export type MediaType = "image" | "video" | "unknown";

export type MediaState = "local" | "uploading" | "uploaded" | "failed";

// Core media item interface
export interface MediaItem {
  id: string;
  type: MediaType;
  mimeType: string;
  file?: File; // Original file (for local/uploading states)
  state: MediaState;

  // URLs - only one should be primary at a time
  urls: {
    // For display/preview (always available)
    preview: string;
    // For playback (videos only, when uploaded)
    playback?: string;
    // For thumbnail (videos only, when uploaded)
    thumbnail?: string;
    // For sharing/public access (when uploaded)
    public?: string;
  };

  // Metadata
  aspectRatio?: string;
  duration?: number; // video duration in seconds
  fileSize?: number; // in bytes

  // Upload progress
  uploadProgress?: number; // 0-100
  error?: string;
}

// Factory functions for creating media items
export interface MediaItemFactory {
  fromFile: (file: File) => MediaItem;
  fromAttachment: (attachment: SharedAttachmentSpec) => MediaItem;
  fromUploadResult: (
    result: UploadResult,
    originalItem: MediaItem,
  ) => MediaItem;
}

// Note: UploadResult types are imported from @/services/attachment-upload

// Renderer interface for consistent media display
export interface MediaRenderer {
  canRender: (item: MediaItem) => boolean;
  renderThumbnail: (item: MediaItem, className?: string) => React.ReactNode;
  renderPreview: (item: MediaItem, className?: string) => React.ReactNode;
  renderPlayer: (item: MediaItem, className?: string) => React.ReactNode;
}
