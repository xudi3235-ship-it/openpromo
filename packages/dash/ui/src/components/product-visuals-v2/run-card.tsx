import { Badge } from "@openpromo/ui/components/badge";
import { formatDistanceToNow } from "date-fns";
import { Play } from "lucide-react";
import type { RunFeedItem } from "@/features/product-visuals-v2/product-visuals-types";
import { RunCardActions } from "./run-card-actions";
import { StatusPill } from "./status-pill";

export function RunCard({
  run,
  onSelect,
}: {
  run: RunFeedItem;
  onSelect: () => void;
}) {
  const coverVideo =
    run.output.output?.videos?.[0] || run.artifacts?.videos?.[0];
  const coverImage =
    run.output.output?.images?.[0] || run.artifacts?.images?.[0];

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border bg-white">
      <button type="button" onClick={onSelect} className="group relative block">
        <div className="aspect-video w-full bg-gray-50">
          {coverVideo ? (
            <video
              src={coverVideo.videoUrl}
              autoPlay
              muted
              loop
              playsInline
              className="h-full w-full object-cover"
            />
          ) : coverImage ? (
            <img
              src={coverImage.imageUrl}
              alt={run.input.prompt}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No media yet
            </div>
          )}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/20 group-hover:opacity-100">
          <Play className="h-6 w-6 text-white" />
        </div>
      </button>
      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="capitalize">
            {run.agentName.replace("_", " ")}
          </Badge>
          <StatusPill status={run.status} />
        </div>
        <p className="line-clamp-2 break-words text-sm text-gray-800">
          {run.input.prompt}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{formatDistanceToNow(new Date(run.createdAt))} ago</span>
          <RunCardActions run={run} />
        </div>
      </div>
    </div>
  );
}
