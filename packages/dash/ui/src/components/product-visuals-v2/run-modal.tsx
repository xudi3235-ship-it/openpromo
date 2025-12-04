import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import { Dialog, DialogContent } from "@openpromo/ui/components/dialog";
import { formatDistanceToNow } from "date-fns";
import type { RunFeedItem } from "@/features/product-visuals-v2/product-visuals-types";
import { StatusPill } from "./status-pill";

export function RunModal({
  run,
  onClose,
}: {
  run: RunFeedItem;
  onClose: () => void;
}) {
  const finalVideos = run.output.output?.videos ?? [];
  const finalImages = run.output.output?.images ?? [];
  const allVideos = [...(run.artifacts?.videos ?? []), ...finalVideos];
  const allImages = [...(run.artifacts?.images ?? []), ...finalImages];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl p-0">
        <div className="grid gap-4 p-4 lg:grid-cols-[240px_1fr]">
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold">All artifacts</h4>
              <p className="text-xs text-muted-foreground">
                Includes intermediate outputs.
              </p>
            </div>
            <div className="space-y-2">
              {allVideos.map((v) => (
                <video
                  key={v.id}
                  src={v.videoUrl}
                  controls
                  className="w-full rounded border"
                />
              ))}
              {allImages.map((img) => (
                <img
                  key={img.id}
                  src={img.imageUrl}
                  alt={img.id}
                  className="w-full rounded border"
                />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold">Final output</h4>
              <p className="text-xs text-muted-foreground">
                Ready to download or share.
              </p>
            </div>
            <div className="space-y-3">
              {finalVideos.map((v) => (
                <video
                  key={v.id}
                  src={v.videoUrl}
                  controls
                  className="w-full rounded border"
                />
              ))}
              {finalImages.map((img) => (
                <img
                  key={img.id}
                  src={img.imageUrl}
                  alt={img.id}
                  className="w-full rounded border"
                />
              ))}
              {finalVideos.length === 0 && finalImages.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No final output yet.
                </p>
              )}
            </div>
            <div className="space-y-1 text-sm">
              <p className="font-medium">Prompt</p>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {run.input.prompt}
              </p>
              <div className="flex items-center gap-2 pt-2">
                <Badge variant="outline" className="capitalize">
                  {run.agentName.replace("_", " ")}
                </Badge>
                <StatusPill status={run.status} />
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(run.createdAt))} ago
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              {run.output.output?.videos?.[0]?.videoUrl && (
                <Button asChild>
                  <a
                    href={run.output.output.videos[0].videoUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open video
                  </a>
                </Button>
              )}
              {run.output.output?.images?.[0]?.imageUrl && (
                <Button asChild>
                  <a
                    href={run.output.output.images[0].imageUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open image
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
