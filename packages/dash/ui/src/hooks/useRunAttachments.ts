import { useMemo } from "react";
import type { RunFeedItem } from "@/features/instant-ad/instant-ad-types";

export function useRunAttachments(run: RunFeedItem | undefined) {
  const attachments = useMemo(() => {
    if (!run) return [];

    // Map all output images/videos to attachments
    const videos = (run.output.output?.videos || []).map((v) => ({
      id: run.id,
      type: "video" as const,
      publicUrl: v.videoUrl,
      mimeType: "video/mp4",
      source: "remote" as const,
    }));
    const images = (run.output.output?.images || []).map((i) => ({
      id: run.id,
      type: "photo" as const,
      publicUrl: i.imageUrl,
      mimeType: "image/jpeg",
      source: "remote" as const,
    }));

    // Also check artifacts for backwards compatibility
    const artifactVideos = (run.artifacts?.videos || []).map((v) => ({
      id: run.id,
      type: "video" as const,
      publicUrl: v.videoUrl,
      mimeType: "video/mp4",
      source: "remote" as const,
    }));
    const artifactImages = (run.artifacts?.images || []).map((i) => ({
      id: run.id,
      type: "photo" as const,
      publicUrl: i.imageUrl,
      mimeType: "image/jpeg",
      source: "remote" as const,
    }));

    return [...videos, ...images, ...artifactVideos, ...artifactImages];
  }, [run]);

  const isVideo = attachments.some((att) => att.type === "video");
  const hasMedia = attachments.length > 0;

  // For download functionality - get the first media URL
  const firstMediaUrl = useMemo(() => {
    const firstVideo = attachments.find((att) => att.type === "video");
    if (firstVideo) return firstVideo.publicUrl;

    const firstImage = attachments.find((att) => att.type === "photo");
    return firstImage?.publicUrl;
  }, [attachments]);

  return {
    attachments,
    isVideo,
    hasMedia,
    firstMediaUrl,
  };
}
