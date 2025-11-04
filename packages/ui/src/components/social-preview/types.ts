export type PreviewSize = "thumbnail" | "compact" | "default" | "large";

export type PreviewPlatform = "FACEBOOK" | "INSTAGRAM" | "TIKTOK";

export type PreviewContentType = "feed" | "reel" | "story";

export interface PreviewSizeConfig {
  /** Tailwind width class */
  width: string;
  /** Tailwind max-width class */
  maxWidth: string;
  /** Optional height constraint for compact layouts */
  height?: string;
}

export const SIZE_CONFIG: Record<PreviewSize, PreviewSizeConfig> = {
  thumbnail: {
    width: "w-32",
    maxWidth: "max-w-[128px]",
    height: "h-[227px]", // 128px * 16/9 for vertical content
  },
  compact: {
    width: "w-56",
    maxWidth: "max-w-[220px]",
    height: "h-[391px]", // 220px * 16/9 for vertical content
  },
  default: {
    width: "w-full",
    maxWidth: "max-w-[280px]",
  },
  large: {
    width: "w-full",
    maxWidth: "max-w-md",
  },
};

export interface PreviewMediaItem {
  type: "photo" | "video";
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
}

export interface PreviewData {
  accountName?: string | null;
  profilePicUrl?: string | null;
  caption?: string | null;
  media?: PreviewMediaItem[];
  location?: string | null;
  timestamp?: Date | string | null;
  metrics?: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
  };
}

export interface BasePreviewProps {
  size?: PreviewSize;
  className?: string;
}
