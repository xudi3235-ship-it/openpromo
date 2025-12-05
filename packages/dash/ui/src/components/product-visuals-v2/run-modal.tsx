import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import { Dialog, DialogContent } from "@openpromo/ui/components/dialog";
import { ScrollArea } from "@openpromo/ui/components/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink } from "lucide-react";
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
  const artifactVideos = run.artifacts?.videos ?? [];
  const artifactImages = run.artifacts?.images ?? [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-7xl min-w-[50vw] h-[90vh] p-0 flex flex-col">
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-6 p-6">
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {run.agentName.replace("_", " ")}
                </Badge>
                <StatusPill status={run.status} />
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(run.createdAt))} ago
                </span>
              </div>
              <div>
                <h3 className="text-sm font-medium">Prompt</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {run.input.prompt}
                </p>
              </div>
            </div>

            {/* Final Output */}
            {(finalVideos.length > 0 || finalImages.length > 0) && (
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-semibold">Final Output</h4>
                  <p className="text-xs text-muted-foreground">
                    Ready to download or share.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {finalVideos.map((v) => (
                    <div
                      key={v.id}
                      className="overflow-hidden rounded-lg border bg-muted"
                    >
                      <video
                        src={v.videoUrl}
                        controls
                        className="w-full h-auto"
                      />
                    </div>
                  ))}
                  {finalImages.map((img) => (
                    <div
                      key={img.id}
                      className="overflow-hidden rounded-lg border bg-muted"
                    >
                      <img
                        src={img.imageUrl}
                        alt={img.id}
                        className="w-full h-auto"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Artifacts */}
            {(artifactVideos.length > 0 || artifactImages.length > 0) && (
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-semibold">
                    Intermediate Outputs
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Processing artifacts and intermediate steps.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {artifactVideos.map((v) => (
                    <div
                      key={v.id}
                      className="overflow-hidden rounded-lg border bg-muted"
                    >
                      <video
                        src={v.videoUrl}
                        controls
                        className="w-full h-auto"
                      />
                    </div>
                  ))}
                  {artifactImages.map((img) => (
                    <div
                      key={img.id}
                      className="overflow-hidden rounded-lg border bg-muted"
                    >
                      <img
                        src={img.imageUrl}
                        alt={img.id}
                        className="w-full h-auto"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {finalVideos.length === 0 &&
              finalImages.length === 0 &&
              artifactVideos.length === 0 &&
              artifactImages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    No outputs yet. Check back soon.
                  </p>
                </div>
              )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {finalVideos[0]?.videoUrl && (
            <Button asChild variant="default" size="sm">
              <a
                href={finalVideos[0].videoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open video
              </a>
            </Button>
          )}
          {finalImages[0]?.imageUrl && (
            <Button asChild variant="default" size="sm">
              <a
                href={finalImages[0].imageUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open image
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
