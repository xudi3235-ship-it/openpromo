import { Badge } from "@openpromo/ui/components/badge";
import { cn } from "@openpromo/ui/lib/utils";
import { Film, ImageIcon } from "lucide-react";
import type { RunFeedItem } from "@/features/product-visuals-v2/product-visuals-types";

interface ResultCardProps {
  run: RunFeedItem;
  onSelect: () => void;
}

const stateLabelMap: Record<RunFeedItem["status"], string> = {
  not_started: "Queued",
  running: "Processing",
  succeeded: "Completed",
  failed: "Failed",
  canceled: "Canceled",
};

export function ResultCard({ run, onSelect }: ResultCardProps) {
  const coverVideo =
    run.output.output?.videos?.[0] || run.artifacts?.videos?.[0];
  const coverImage =
    run.output.output?.images?.[0] || run.artifacts?.images?.[0];
  const preview = coverImage?.imageUrl || coverVideo?.videoUrl || null;

  const createdLabel = run.createdAt
    ? new Date(run.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "";

  const isFailed = run.status === "failed";
  const isPending = run.status === "running" || run.status === "not_started";
  const isVideo = !!coverVideo;

  return (
    <div
      className={cn(
        "border overflow-hidden hover:border-foreground/50 transition-colors group relative border-gray-200 dark:border-gray-800",
        preview && "cursor-pointer hover:shadow-md",
      )}
      onClick={preview ? onSelect : undefined}
    >
      <div className="absolute top-2 left-9 z-10">
        <div className="flex items-center gap-1 rounded-full bg-background/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium border shadow-sm">
          {isVideo ? (
            <Film className="h-3 w-3" />
          ) : (
            <ImageIcon className="h-3 w-3" />
          )}
          <span>{isVideo ? "Video" : "Image"}</span>
        </div>
      </div>

      {isVideo && preview && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white">
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </div>
      )}

      <div className="aspect-square bg-muted relative overflow-hidden">
        {preview ? (
          isVideo ? (
            <video
              src={preview}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={preview}
              alt="Generated"
              className="w-full h-full object-cover"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xs text-muted-foreground">
              {isVideo ? (
                <Film className="h-8 w-8" />
              ) : (
                <ImageIcon className="h-8 w-8" />
              )}
            </span>
          </div>
        )}
      </div>

      <div className="p-2.5 bg-background">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          {isPending && (
            <Badge
              variant="secondary"
              className="px-1.5 py-0 text-[10px] h-auto"
            >
              {stateLabelMap[run.status]}
            </Badge>
          )}
          {isFailed && (
            <Badge
              variant="destructive"
              className="px-1.5 py-0 text-[10px] h-auto"
            >
              Failed
            </Badge>
          )}
          {createdLabel && <span className="text-[10px]">{createdLabel}</span>}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {run.input.prompt ? run.input.prompt.substring(0, 50) : "No prompt"}
        </p>
      </div>
    </div>
  );
}
