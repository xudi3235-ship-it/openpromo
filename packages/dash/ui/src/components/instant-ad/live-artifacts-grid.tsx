import { cn } from "@openpromo/ui/lib/utils";
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
  className?: string;
}

/**
 * Grid display for live-streaming artifacts during generation.
 * Features aesthetic breathing skeleton and fade-in animations.
 */
export function LiveArtifactsGrid({
  artifacts,
  className = "",
}: LiveArtifactsGridProps) {
  // Track seen IDs for animation
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const prevArtifactsRef = useRef<string[]>([]);

  // Combine all artifacts - memoized to avoid recreating on every render
  const allArtifacts: Artifact[] = useMemo(
    () => [
      ...artifacts.videos.map((v) => ({ id: v.id, videoUrl: v.videoUrl })),
      ...artifacts.images.map((i) => ({ id: i.id, imageUrl: i.imageUrl })),
    ],
    [artifacts.videos, artifacts.images],
  );

  // Update seen IDs when new artifacts arrive
  useEffect(() => {
    const currentIds = allArtifacts.map((a) => a.id);
    const newIds = currentIds.filter(
      (id) => !prevArtifactsRef.current.includes(id),
    );

    if (newIds.length > 0) {
      // Delay marking as seen to allow animation
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
      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-auto p-4">
        {!hasAssets ? (
          // Empty state with breathing skeleton
          <div className="flex flex-col items-center justify-center h-full">
            <BreathingSkeleton />
            <p className="text-sm text-muted-foreground/60 mt-6">
              Creating your content...
            </p>
          </div>
        ) : (
          // Artifacts grid with one trailing skeleton
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
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
            {/* Single breathing skeleton for "next" artifact */}
            <BreathingSkeletonCard />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Individual artifact card with fade-in animation
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
        "relative overflow-hidden rounded-lg border bg-card transition-all duration-300",
        isNew && "animate-in fade-in zoom-in-95",
      )}
    >
      {/* Type badge */}
      <div className="absolute top-2 left-2 z-10">
        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-black/60 text-white backdrop-blur-sm">
          {isVideo ? "Video" : "Image"}
        </span>
      </div>

      {isVideo ? (
        <video
          src={artifact.videoUrl}
          autoPlay
          muted
          loop
          playsInline
          controls
          className="aspect-[9/16] w-full object-cover"
        />
      ) : (
        <img
          src={artifact.imageUrl}
          alt="Generated artifact"
          className="aspect-[9/16] w-full object-cover"
        />
      )}
    </div>
  );
}

/**
 * Full-width breathing skeleton for empty state
 */
function BreathingSkeleton() {
  return (
    <div className="w-full max-w-xs">
      <div className="aspect-[9/16] rounded-2xl overflow-hidden relative">
        {/* Gradient background with breathing animation */}
        <div className="absolute inset-0 bg-gradient-to-br from-muted/40 via-muted/20 to-muted/40 animate-pulse" />

        {/* Subtle shimmer overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
          style={{
            animation: "shimmer 2s ease-in-out infinite",
          }}
        />

        {/* Content placeholder lines */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 gap-3">
          <div className="w-16 h-16 rounded-full bg-muted/30 animate-pulse" />
          <div className="flex flex-col items-center gap-2 w-full">
            <div
              className="h-2 bg-muted/30 rounded-full animate-pulse"
              style={{ width: "60%" }}
            />
            <div
              className="h-2 bg-muted/20 rounded-full animate-pulse"
              style={{ width: "40%", animationDelay: "150ms" }}
            />
          </div>
        </div>

        {/* Border with subtle glow */}
        <div className="absolute inset-0 rounded-2xl border border-muted-foreground/10" />
      </div>

      {/* Add shimmer keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

/**
 * Small breathing skeleton card for grid placeholder
 */
function BreathingSkeletonCard() {
  return (
    <div className="aspect-[9/16] rounded-lg overflow-hidden relative border border-dashed border-muted-foreground/20">
      {/* Gradient background with breathing animation */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-muted/30 via-muted/10 to-muted/30"
        style={{
          animation: "breathe 3s ease-in-out infinite",
        }}
      />

      {/* Subtle shimmer */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-transparent"
        style={{
          animation: "shimmer 2.5s ease-in-out infinite",
        }}
      />

      {/* Minimal content indicator */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 opacity-40">
          <div
            className="w-8 h-8 rounded-full border-2 border-muted-foreground/30"
            style={{
              animation: "breathe 3s ease-in-out infinite",
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes breathe {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
