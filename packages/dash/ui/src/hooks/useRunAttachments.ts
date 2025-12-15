import { useMemo } from "react";
import type { RunFeedItem } from "@/features/instant-ad/instant-ad-types";
import type { LiveRunData } from "@/stores/live-run-store";

type RunData = RunFeedItem | LiveRunData | undefined;

export function useRunAttachments(run: RunData) {
  const attachments = useMemo(() => {
    if (!run) return [];

    // Get ID - LiveRunData uses runId, RunFeedItem uses id
    const runId = "runId" in run ? run.runId : run.id;

    // Get output videos/images from either run type
    const outputVideos = run.output?.output?.videos ?? [];
    const outputImages = run.output?.output?.images ?? [];

    // Map all output images/videos to attachments
    const videos = outputVideos.map((v) => ({
      id: runId,
      type: "video" as const,
      publicUrl: v.videoUrl,
      mimeType: "video/mp4",
      source: "remote" as const,
    }));
    const images = outputImages.map((i) => ({
      id: runId,
      type: "photo" as const,
      publicUrl: i.imageUrl,
      mimeType: "image/jpeg",
      source: "remote" as const,
    }));

    const allAttachments = [...videos, ...images];

    // Deduplicate by publicUrl to avoid duplicates when same media exists in both output and artifacts
    const uniqueAttachments = allAttachments.filter(
      (attachment, index, self) =>
        self.findIndex((a) => a.publicUrl === attachment.publicUrl) === index,
    );

    return uniqueAttachments;
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
