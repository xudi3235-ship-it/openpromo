import { Button } from "@openpromo/ui/components/button";
import type { SharedAttachmentSpec } from "@shared/content";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
} from "lucide-react";
import { useState } from "react";
import { useAttachmentRenderer } from "@/hooks/useAttachmentRenderer";
import { PreviewMediaNullState } from "./null-state";

export interface PostPreviewCardProps {
  platform: "INSTAGRAM" | "FACEBOOK" | "TIKTOK";
  accountName?: string | null;
  profilePicUrl?: string | null;
  caption?: string | null;
  attachments?: SharedAttachmentSpec[];
  location?: string | null;
  likesCount?: number | null;
  timestampLabel?: string | null;
}

export function InstagramFeedCard(props: PostPreviewCardProps) {
  const {
    accountName,
    profilePicUrl,
    caption,
    attachments = [],
    location,
    likesCount,
    timestampLabel,
  } = props;

  const [currentSlide, setCurrentSlide] = useState(0);
  const { getAttachmentUrl, renderAttachment } = useAttachmentRenderer({
    attachments,
  });

  const nextSlide = () => {
    if (attachments.length > 1) {
      setCurrentSlide((prev) => (prev + 1) % attachments.length);
    }
  };

  const prevSlide = () => {
    if (attachments.length > 1) {
      setCurrentSlide(
        (prev) => (prev - 1 + attachments.length) % attachments.length,
      );
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") prevSlide();
    if (event.key === "ArrowRight") nextSlide();
  };

  const attachment = attachments[currentSlide];
  const attachmentUrl = attachment ? getAttachmentUrl(attachment) : null;

  return (
    <div className="max-w-sm overflow-hidden rounded-lg border bg-background">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center space-x-3">
          {profilePicUrl ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400 p-0.5">
              <img
                src={profilePicUrl}
                alt={accountName ?? ""}
                className="h-full w-full rounded-full object-cover bg-white"
              />
            </div>
          ) : (
            <div className="h-8 w-8 rounded-full bg-muted" />
          )}
          <div>
            <h4 className="text-sm font-semibold">
              {accountName ?? "Instagram account"}
            </h4>
            <p className="text-xs text-muted-foreground">
              {location ?? "Location"}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="p-1">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      <div
        className="group relative aspect-square focus:outline-none"
        tabIndex={attachments.length > 1 ? 0 : -1}
        aria-label="Post media"
        onKeyDown={handleKeyDown}
      >
        {attachment && attachmentUrl ? (
          renderAttachment(attachment, "h-full w-full object-cover", true)
        ) : (
          <PreviewMediaNullState message="Add image or video" />
        )}

        {attachments.length > 1 ? (
          <>
            <button
              type="button"
              onClick={prevSlide}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white opacity-0 transition group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={nextSlide}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white opacity-0 transition group-hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        ) : null}
      </div>

      <div className="space-y-3 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="p-0">
              <Heart className="h-6 w-6" />
            </Button>
            <Button variant="ghost" size="sm" className="p-0">
              <MessageCircle className="h-6 w-6" />
            </Button>
            <Button variant="ghost" size="sm" className="p-0">
              <Send className="h-6 w-6" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="p-0">
            <Bookmark className="h-6 w-6" />
          </Button>
        </div>
        {typeof likesCount === "number" ? (
          <div className="text-sm font-semibold">{likesCount} likes</div>
        ) : null}
        <div className="text-sm leading-relaxed">
          <span className="font-semibold">
            {accountName ?? "Instagram account"}
          </span>{" "}
          <span className="text-muted-foreground">
            {caption ?? "Add a caption"}
          </span>
        </div>
        <div className="text-xs uppercase text-muted-foreground">
          {timestampLabel ?? "Just now"}
        </div>
      </div>
    </div>
  );
}
