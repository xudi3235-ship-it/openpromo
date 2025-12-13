import { cn } from "@openpromo/ui/lib/utils";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface Artifact {
  id: string;
  videoUrl?: string;
  imageUrl?: string;
}

interface LiveArtifactsGridProps {
  artifacts: {
    videos: Array<{ id: string; videoUrl: string }>;
    images: Array<{ id: string; imageUrl: string }>;
  };
  latestLog?: string;
  className?: string;
}

// TODO: Remove after testing - hardcoded sample media for design iteration
const DEBUG_ARTIFACTS = true;
const SAMPLE_ARTIFACTS: Artifact[] = [
  {
    id: "sample-1",
    imageUrl:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=711&fit=crop",
  },
  {
    id: "sample-2",
    imageUrl:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=711&fit=crop",
  },
  {
    id: "sample-3",
    imageUrl:
      "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=711&fit=crop",
  },
];

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
  const prevArtifactsRef = useRef<string[]>([]);

  // Debug: cycle through sample logs for testing
  const debugLog = DEBUG_ARTIFACTS
    ? (latestLog ?? "Analyzing product details...")
    : latestLog;

  // Animate log transitions
  useEffect(() => {
    if (debugLog && debugLog !== displayedLog) {
      // Fade out
      setIsLogVisible(false);
      // After fade out, update text and fade in
      const timer = setTimeout(() => {
        setDisplayedLog(debugLog);
        setIsLogVisible(true);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [debugLog, displayedLog]);

  const allArtifacts: Artifact[] = useMemo(() => {
    const real = [
      ...artifacts.videos.map((v) => ({ id: v.id, videoUrl: v.videoUrl })),
      ...artifacts.images.map((i) => ({ id: i.id, imageUrl: i.imageUrl })),
    ];
    return DEBUG_ARTIFACTS && real.length === 0 ? SAMPLE_ARTIFACTS : real;
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
    </div>
  );
}

/**
 * Individual artifact card with 9:16 aspect ratio
 */
function ArtifactCard({
  artifact,
  isNew,
}: {
  artifact: Artifact;
  isNew: boolean;
}) {
  const isVideo = !!artifact.videoUrl;

  return (
    <div
      className={cn(
        CARD_CLASS,
        "relative overflow-hidden border bg-card",
        "transition-all duration-500 ease-in-out",
        "hover:border-primary/30",
        "cursor-pointer group",
        isNew && "animate-in fade-in-50 duration-300",
      )}
    >
      {/* Type badge */}
      <div className="absolute top-2 left-2 z-10">
        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-black/50 text-white transition-colors group-hover:bg-black/70">
          {isVideo ? "Video" : "Image"}
        </span>
      </div>

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
    </div>
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
