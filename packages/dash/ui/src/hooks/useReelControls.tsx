import { useEffect, useRef, useState } from "react";
import { useAttachmentRenderer } from "@/hooks/useAttachmentRenderer";
import { useComposerStore } from "@/stores/composer-store";

export function useReelControls() {
  const contentCreateData = useComposerStore((s) => s.contentCreateData);
  const { getAttachmentUrl, renderAttachment } = useAttachmentRenderer();
  const attachments = contentCreateData.base.attachments ?? [];
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Get the first video attachment for the reel
  const videoAttachment = attachments.find((att) => att.type === "video");

  // Check if we have a stream iframe (uploaded video) vs local file
  const hasStreamIframe =
    videoAttachment?.metadata?.previewIframeUrl && !videoAttachment.file;

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const renderVideo = (className: string = "w-full h-full object-cover") => {
    if (!videoAttachment || !getAttachmentUrl(videoAttachment)) return null;

    return renderAttachment(videoAttachment, className, false);
  };

  const renderLocalVideoControls = () => {
    if (
      hasStreamIframe ||
      !videoAttachment ||
      !getAttachmentUrl(videoAttachment)
    ) {
      return null;
    }

    return (
      <video
        ref={videoRef}
        src={getAttachmentUrl(videoAttachment) as string}
        className="hidden"
        loop
        playsInline
        muted={isMuted}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      >
        <track kind="captions" />
      </video>
    );
  };

  return {
    // State
    isPlaying,
    isMuted,
    hasStreamIframe,
    videoAttachment,
    message: contentCreateData.base.message,

    // Actions
    togglePlay,
    toggleMute,

    // Render helpers
    renderVideo,
    renderLocalVideoControls,
  };
}
