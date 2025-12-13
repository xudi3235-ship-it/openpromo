import { cn } from "@openpromo/ui/lib/utils";
import { Film, ImageIcon } from "lucide-react";
import {
  GridCard,
  GridCardActions,
  GridCardBadges,
  GridCardCheckbox,
  GridCardFooter,
  GridCardMedia,
  GridCardStateOverlay,
  GridCardStatusBadge,
  GridCardTypeBadge,
} from "@/components/common";
import type { RunFeedItem } from "@/features/instant-ad/instant-ad-types";
import { ResultCardActions } from "./result-card-actions";

interface ResultCardProps {
  run: RunFeedItem;
  onSelect: () => void;
  onDelete?: (run: RunFeedItem) => Promise<void>;
  isDeleting?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (runId: string) => void;
  /** Whether this run is currently being generated (WebSocket active) */
  isLive?: boolean;
}

const stateLabelMap: Record<RunFeedItem["status"], string> = {
  not_started: "Queued",
  running: "Processing",
  succeeded: "Completed",
  failed: "Failed",
  canceled: "Canceled",
};

export function ResultCard({
  run,
  onSelect,
  onDelete,
  isDeleting,
  isSelected,
  onToggleSelect,
  isLive: _isLive,
}: ResultCardProps) {
  const isVideo = run.input.mode === "video_gen";
  const coverVideo =
    run.output.output?.videos?.[0] || run.artifacts?.videos?.[0];
  const coverImage =
    run.output.output?.images?.[0] || run.artifacts?.images?.[0];
  const preview = coverVideo?.videoUrl || coverImage?.imageUrl || null;

  const createdLabel = run.createdAt
    ? new Date(run.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "";

  const isFailed = run.status === "failed";
  const isPending = run.status === "running" || run.status === "not_started";

  return (
    <GridCard
      onClick={onSelect}
      isHoverable={!!preview && !isPending && !isFailed}
      className={cn(
        "group",
        isPending && "border-gray-300 dark:border-gray-600 cursor-default",
        !isPending &&
          !isFailed &&
          preview &&
          "hover:border-foreground/50 hover:shadow-md",
      )}
    >
      <GridCardBadges>
        {onToggleSelect && (
          <GridCardCheckbox
            checked={isSelected ?? false}
            onCheckedChange={() => onToggleSelect(run.id)}
          />
        )}
        <GridCardTypeBadge
          icon={
            isVideo ? (
              <Film className="h-3 w-3" />
            ) : (
              <ImageIcon className="h-3 w-3" />
            )
          }
          label={isVideo ? "Video" : "Image"}
        />
      </GridCardBadges>

      <GridCardActions>
        <ResultCardActions
          run={run}
          onDelete={onDelete}
          isDeleting={isDeleting}
        />
      </GridCardActions>

      <GridCardMedia>
        {preview && !isPending && !isFailed ? (
          isVideo ? (
            <video
              src={coverVideo?.videoUrl}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={coverImage?.imageUrl}
              alt="Generated"
              className="w-full h-full object-cover"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/20" />
        )}

        {isPending && (
          <GridCardStateOverlay
            state={run.status === "running" ? "processing" : "queued"}
            message={stateLabelMap[run.status]}
          />
        )}
        {isFailed && <GridCardStateOverlay state="failed" />}
        {!preview && !isPending && !isFailed && (
          <GridCardStateOverlay state="completed" />
        )}
      </GridCardMedia>

      <GridCardFooter>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <GridCardStatusBadge variant={isFailed ? "destructive" : "secondary"}>
            {stateLabelMap[run.status]}
          </GridCardStatusBadge>
          {createdLabel && <span className="text-[10px]">{createdLabel}</span>}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {run.input.prompt ? run.input.prompt.substring(0, 50) : "No prompt"}
        </p>
      </GridCardFooter>
    </GridCard>
  );
}
