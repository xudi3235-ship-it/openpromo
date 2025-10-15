import type { SharedAttachmentSpec } from "@shared/content";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Music2,
  Share2,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useAttachmentRenderer } from "@/hooks/useAttachmentRenderer";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useComposerPreview } from "@/stores/composer-preview-store";

const handleFromName = (name?: string) =>
  name ? name.toLowerCase().replace(/[^a-z0-9]+/g, "_") : "openpromo";

// Action Sidebar Component

function TikTokActionSidebar() {
  const actions = [
    { icon: Heart, label: "1.2K" },
    { icon: MessageCircle, label: "245" },
    { icon: Share2, label: "Share" },
  ];

  return (
    <div className="absolute right-2 bottom-12 z-10 flex flex-col items-center gap-3 text-white/85">
      {actions.map(({ icon: Icon, label }) => (
        <div key={label} className="flex flex-col items-center gap-0.5">
          <div className="w-8 h-8 rounded-full border border-white/10 bg-black/45 backdrop-blur flex items-center justify-center">
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-medium">{label}</span>
        </div>
      ))}
      <div className="w-8 h-8 rounded-full border border-white/10 bg-black/45 backdrop-blur flex items-center justify-center">
        <Music2 className="w-3.5 h-3.5" />
      </div>
    </div>
  );
}

// Author Info Component
interface TikTokAuthorInfoProps {
  profilePicUrl?: string;
  displayName: string;
  handle: string;
}

function TikTokAuthorInfo({
  profilePicUrl,
  displayName,
  handle,
}: TikTokAuthorInfoProps) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="relative">
        <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-pink-500/60 via-red-400/50 to-cyan-400/60 blur" />
        <div className="relative w-7 h-7 rounded-full overflow-hidden bg-black/60 backdrop-blur flex items-center justify-center uppercase font-semibold text-xs">
          {profilePicUrl ? (
            <img
              src={profilePicUrl}
              alt={displayName || handle}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{displayName?.charAt(0) || "O"}</span>
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          @{handle}
          <button
            type="button"
            className="rounded-full border border-white/15 bg-white text-black text-[9px] font-semibold px-2 py-0.5"
          >
            Follow
          </button>
        </div>
        <div className="text-[10px] text-white/70 truncate">{displayName}</div>
      </div>
    </div>
  );
}

// Bottom Info Component
interface TikTokBottomInfoProps {
  profilePicUrl?: string;
  displayName: string;
  handle: string;
  caption?: string;
}

function TikTokBottomInfo({
  profilePicUrl,
  displayName,
  handle,
  caption,
}: TikTokBottomInfoProps) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 px-3 pb-2 pt-12 bg-gradient-to-t from-black via-black/85 via-30% to-transparent">
      {/* Author Info */}
      <TikTokAuthorInfo
        profilePicUrl={profilePicUrl}
        displayName={displayName}
        handle={handle}
      />

      {/* Caption */}
      {caption && (
        <p className="mb-2 text-xs text-white/90 leading-relaxed line-clamp-2 break-words">
          {caption}
        </p>
      )}

      {/* Original Sound */}
      <div className="flex items-center justify-between text-[11px] text-white/80 py-1.5 px-1">
        <div className="flex items-center gap-2 truncate">
          <Music2 className="w-3.5 h-3.5" />
          <span className="truncate max-w-[180px]">
            Original sound • {displayName}
          </span>
        </div>
        <Bookmark className="w-4 h-4 shrink-0" />
      </div>
    </div>
  );
}

// Photo Gallery Component
interface TikTokPhotoGalleryProps {
  photoAttachments: SharedAttachmentSpec[];
  activePhotoIndex: number;
  onPrevious: () => void;
  onNext: () => void;
  renderAttachment: (
    attachment: SharedAttachmentSpec,
    className: string,
  ) => ReactNode;
}

function TikTokPhotoGallery({
  photoAttachments,
  activePhotoIndex,
  onPrevious,
  onNext,
  renderAttachment,
}: TikTokPhotoGalleryProps) {
  const totalPhotos = photoAttachments.length;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className="flex h-full w-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${activePhotoIndex * 100}%)` }}
      >
        {photoAttachments.map((attachment, index) => {
          const key =
            attachment.id ??
            attachment.publicUrl ??
            attachment.thumbnailUrl ??
            `photo-${index}`;
          return (
            <div key={key} className="h-full w-full shrink-0">
              {renderAttachment(
                attachment,
                "w-full h-full object-cover select-none",
              )}
            </div>
          );
        })}
      </div>

      {totalPhotos > 1 && (
        <>
          <button
            type="button"
            onClick={onPrevious}
            disabled={activePhotoIndex === 0}
            className="absolute left-3 top-3/8 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur focus:outline-none focus:ring-2 focus:ring-white/40 disabled:opacity-40"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={activePhotoIndex === totalPhotos - 1}
            className="absolute right-3 top-3/8 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur focus:outline-none focus:ring-2 focus:ring-white/40 disabled:opacity-40"
            aria-label="Next photo"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="absolute top-4 left-4 z-20 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium tracking-wide">
            {activePhotoIndex + 1}/{totalPhotos}
          </div>

          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
            {photoAttachments.map((attachment, index) => {
              const key =
                attachment.id ??
                attachment.publicUrl ??
                attachment.thumbnailUrl ??
                `dot-${index}`;
              return (
                <span
                  key={key}
                  className={`h-1.5 w-5 rounded-full transition-colors ${
                    index === activePhotoIndex ? "bg-white" : "bg-white/35"
                  }`}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// Empty State Component
function TikTokEmptyState() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-[#0f172a] via-[#0b1020] to-[#04050b] text-white/70">
      <div className="w-16 h-16 rounded-xl border border-white/10 bg-white/5 backdrop-blur flex items-center justify-center">
        <Music2 className="w-7 h-7" />
      </div>
      <p className="px-8 text-center text-sm leading-relaxed">
        Drop a video or photos to preview your TikTok.
      </p>
    </div>
  );
}

interface TikTokPreviewProps {
  accountId?: string;
}

export function TikTokPreview({ accountId }: TikTokPreviewProps) {
  const { workspace } = useWorkspace();
  const previewData = useComposerPreview({
    platform: "TIKTOK",
    accountId,
  });
  const attachments = previewData.attachments ?? [];
  const { renderAttachment } = useAttachmentRenderer({ attachments });

  const { videoAttachment, photoAttachments } = useMemo(() => {
    const photos = attachments.filter(
      (attachment) => attachment.type === "photo",
    );
    const video = attachments.find((attachment) => attachment.type === "video");
    return {
      photoAttachments: photos,
      videoAttachment: video,
    };
  }, [attachments]);

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  useEffect(() => {
    setActivePhotoIndex(0);
  }, []);

  const totalPhotos = photoAttachments.length;
  const isVideoPost = Boolean(videoAttachment);
  const hasPhotoGallery = !isVideoPost && totalPhotos > 0;

  const showPreviousPhoto = () => {
    setActivePhotoIndex((index) => (index === 0 ? index : index - 1));
  };

  const showNextPhoto = () => {
    setActivePhotoIndex((index) =>
      index >= totalPhotos - 1 ? index : index + 1,
    );
  };

  const handle = useMemo(() => {
    if (previewData.username) {
      return previewData.username;
    }
    const display = previewData.getDisplayName(workspace?.name);
    return handleFromName(display);
  }, [previewData, workspace?.name]);

  const displayName = previewData.getDisplayName(workspace?.name);
  const trimmedCaption = (previewData.message || "").trim();

  return (
    <div className="relative max-w-[280px] rounded-xl overflow-hidden border border-white/5 bg-[#070708] text-white shadow-[0_20px_45px_-20px_rgba(8,8,11,0.85)]">
      <div className="relative aspect-[9/16]">
        {/* Media Content */}
        <div className="absolute inset-0">
          {isVideoPost && videoAttachment ? (
            renderAttachment(
              videoAttachment,
              "w-full h-full object-cover",
              true,
            )
          ) : hasPhotoGallery ? (
            <TikTokPhotoGallery
              photoAttachments={photoAttachments}
              activePhotoIndex={activePhotoIndex}
              onPrevious={showPreviousPhoto}
              onNext={showNextPhoto}
              renderAttachment={renderAttachment}
            />
          ) : (
            <TikTokEmptyState />
          )}
        </div>

        {/* Action Sidebar */}
        <TikTokActionSidebar />

        {/* Bottom Info Section */}
        <TikTokBottomInfo
          profilePicUrl={previewData.profilePicUrl}
          displayName={displayName}
          handle={handle}
          caption={trimmedCaption}
        />

        {/* Border Ring */}
        <div className="pointer-events-none absolute inset-0 ring-1 ring-white/5 rounded-xl" />
      </div>
    </div>
  );
}
