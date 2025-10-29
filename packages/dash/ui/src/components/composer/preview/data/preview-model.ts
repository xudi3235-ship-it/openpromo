import type { AllPlatforms, SharedAttachmentSpec } from "@shared/content";

export interface PostPreviewData {
  platform: AllPlatforms;
  accountName?: string | null;
  profilePicUrl?: string | null;
  caption?: string | null;
  attachments?: SharedAttachmentSpec[];
  location?: string | null;
  likesCount?: number | null;
  commentsCount?: number | null;
  sharesCount?: number | null;
  timestampLabel?: string | null;
  callToActionLabel?: string | null;
}
