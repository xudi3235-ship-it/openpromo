import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@openpromo/ui/components/dialog";
import { cn } from "@openpromo/ui/lib/utils";
import type { VideoGenRealtime } from "@shared";
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CircularProgress } from "../circular-progress";

// Derive artifact types from the shared schema
type VideoArtifact =
  VideoGenRealtime.ServerAppState["artifacts"]["videos"][number];
type ImageArtifact =
  VideoGenRealtime.ServerAppState["artifacts"]["images"][number];
type Artifact = (VideoArtifact | ImageArtifact) & {
  videoUrl?: string;
  imageUrl?: string;
};

interface LiveArtifactsGridProps {
  artifacts: VideoGenRealtime.ServerAppState["artifacts"];
  latestLog?: string;
  className?: string;
}

// Shared card styles - 9:16 aspect ratio, responsive width
const CARD_CLASS = "w-40 sm:w-48 aspect-[9/16] shrink-0 rounded-xl";

/**
 * Horizontal scrollable row for live-streaming artifacts during generation.
 * Shows artifacts as cards with a trailing skeleton placeholder.
 */
export function LiveArtifactsGrid({
  artifacts,
  latestLog,
  className = "",
}: LiveArtifactsGridProps) {
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [displayedLog, setDisplayedLog] = useState<string | undefined>();
  const [isLogVisible, setIsLogVisible] = useState(false);
  const [previewArtifact, setPreviewArtifact] = useState<Artifact | null>(null);
  const prevArtifactsRef = useRef<string[]>([]);

  // Animate log transitions
  useEffect(() => {
    if (latestLog && latestLog !== displayedLog) {
      // Fade out
      setIsLogVisible(false);
      // After fade out, update text and fade in
      const timer = setTimeout(() => {
        setDisplayedLog(latestLog);
        setIsLogVisible(true);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [latestLog, displayedLog]);

  const allArtifacts: Artifact[] = useMemo(() => {
    return [
      ...artifacts.videos.map((v) => ({ ...v, videoUrl: v.videoUrl })),
      ...artifacts.images.map((i) => ({ ...i, imageUrl: i.imageUrl })),
    ];
  }, [artifacts.videos, artifacts.images]);

  useEffect(() => {
    const currentIds = allArtifacts.map((a) => a.id);
    const newIds = currentIds.filter(
      (id) => !prevArtifactsRef.current.includes(id),
    );

    if (newIds.length > 0) {
      const timer = setTimeout(() => {
        setSeenIds((prev) => {
          const next = new Set(prev);
          for (const id of newIds) next.add(id);
          return next;
        });
      }, 50);
      return () => clearTimeout(timer);
    }

    prevArtifactsRef.current = currentIds;
  }, [allArtifacts]);

  const hasAssets = allArtifacts.length > 0;

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Title + Latest Log */}
      <div className="px-4 pt-4 pb-3">
        <h3 className="text-sm font-medium text-foreground">
          Crafting your content...
        </h3>
        {displayedLog && (
          <p
            className={cn(
              "text-xs text-muted-foreground mt-1.5 truncate max-w-md",
              "transition-opacity duration-300 ease-in-out",
              isLogVisible ? "opacity-100" : "opacity-0",
            )}
          >
            {displayedLog}
          </p>
        )}
      </div>

      {/* Horizontal scrollable row */}
      <div className="overflow-x-auto px-4 pb-4">
        <div className="flex gap-3">
          {hasAssets ? (
            <>
              {allArtifacts.map((artifact) => {
                const isNew = !seenIds.has(artifact.id);
                return (
                  <ArtifactCard
                    key={artifact.id}
                    artifact={artifact}
                    isNew={isNew}
                    onClick={() => setPreviewArtifact(artifact)}
                  />
                );
              })}
              <SkeletonCard />
            </>
          ) : (
            <SkeletonCard />
          )}
        </div>
      </div>

      {/* Preview Modal */}
      <ArtifactPreviewModal
        artifact={previewArtifact}
        onClose={() => setPreviewArtifact(null)}
      />
    </div>
  );
}

/**
 * Individual artifact card with 9:16 aspect ratio
 */
function ArtifactCard({
  artifact,
  isNew,
  onClick,
}: {
  artifact: Artifact;
  isNew: boolean;
  onClick: () => void;
}) {
  const isVideo = !!artifact.videoUrl;
  const isProcessing = artifact.state === "processing";
  const isFailed = artifact.state === "failed";
  const progress = artifact.progressPercent ?? 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        CARD_CLASS,
        "relative overflow-hidden border bg-card",
        "transition-all duration-500 ease-in-out",
        "hover:border-primary/30 hover:scale-[1.02]",
        "cursor-pointer group",
        isNew && "animate-in fade-in-50 duration-300",
        isFailed && "border-destructive/50",
      )}
    >
      {/* Type badge */}
      <div className="absolute top-2 left-2 z-10">
        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-black/50 text-white transition-colors group-hover:bg-black/70">
          {isVideo ? "Video" : "Image"}
        </span>
      </div>

      {/* Progress overlay for processing state */}
      {isProcessing && (
        <div className="absolute inset-0 z-[6] flex items-center justify-center bg-black/40 animate-in fade-in duration-200">
          <CircularProgress percent={progress} />
        </div>
      )}

      {/* Failed state overlay */}
      {isFailed && (
        <div className="absolute inset-0 z-[6] flex flex-col items-center justify-center gap-2 bg-black/60 animate-in fade-in duration-200">
          <AlertCircle className="w-8 h-8 text-destructive" />
          <span className="text-xs font-medium text-white/80">Failed</span>
        </div>
      )}

      {/* Subtle overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-[5]" />

      {isVideo ? (
        <video
          src={artifact.videoUrl}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <img
          src={artifact.imageUrl}
          alt="Generated"
          className="w-full h-full object-cover"
        />
      )}
    </button>
  );
}

/**
 * Skeleton card - same size as artifact cards
 */
function SkeletonCard() {
  return (
    <div
      className={cn(
        CARD_CLASS,
        "border border-dashed border-muted-foreground/20 bg-muted/30",
        "flex flex-col items-center justify-center gap-2",
      )}
    >
      <Loader2 className="w-6 h-6 text-muted-foreground/40 animate-spin" />
      <span className="text-xs text-muted-foreground/50">Generating</span>
    </div>
  );
}

/**
 * Full-screen preview modal for artifacts
 */
function ArtifactPreviewModal({
  artifact,
  onClose,
}: {
  artifact: Artifact | null;
  onClose: () => void;
}) {
  if (!artifact) return null;

  const isVideo = !!artifact.videoUrl;
  const isProcessing = artifact.state === "processing";
  const isFailed = artifact.state === "failed";
  const progress = artifact.progressPercent ?? 0;

  return (
    <Dialog open={!!artifact} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-4xl w-auto p-0 bg-black/95 border-none overflow-hidden"
        overlayClassName="bg-black/80"
      >
        <DialogTitle className="sr-only">Artifact Preview</DialogTitle>
        <div className="relative flex items-center justify-center min-h-[50vh] max-h-[85vh]">
          {/* Progress overlay for processing state */}
          {isProcessing && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
              <CircularProgress percent={progress} size={72} strokeWidth={4} />
            </div>
          )}
          {/* Failed state overlay */}
          {isFailed && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/60 animate-in fade-in duration-200">
              <AlertCircle className="w-12 h-12 text-destructive" />
              <span className="text-sm font-medium text-white/80">
                Generation failed
              </span>
            </div>
          )}
          {isVideo ? (
            <video
              src={artifact.videoUrl}
              autoPlay
              muted
              loop
              playsInline
              controls
              className="max-w-full max-h-[85vh] object-contain"
            />
          ) : (
            <img
              src={artifact.imageUrl}
              alt="Generated content preview"
              className="max-w-full max-h-[85vh] object-contain"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
