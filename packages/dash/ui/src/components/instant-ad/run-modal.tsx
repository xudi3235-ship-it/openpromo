import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@openpromo/ui/components/collapsible";
import { Dialog, DialogContent } from "@openpromo/ui/components/dialog";
import { ScrollArea } from "@openpromo/ui/components/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ExternalLink, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { RunFeedItem } from "@/features/instant-ad/instant-ad-types";
import { useOpenComposer } from "@/hooks/useOpenComposer";
import { StatusPill } from "./status-pill";

export function RunModal({
  run,
  onClose,
}: {
  run: RunFeedItem;
  onClose: () => void;
}) {
  const isGenerating = run.status === "running" || run.status === "not_started";
  const [artifactsOpen, setArtifactsOpen] = useState(isGenerating);
  const openComposer = useOpenComposer();

  const finalVideos = run.output.output?.videos ?? [];
  const finalImages = run.output.output?.images ?? [];
  const artifactVideos = run.artifacts?.videos ?? [];
  const artifactImages = run.artifacts?.images ?? [];

  const firstUrl =
    finalVideos[0]?.videoUrl ||
    finalImages[0]?.imageUrl ||
    artifactVideos[0]?.videoUrl ||
    artifactImages[0]?.imageUrl;

  const handleCreatePost = async () => {
    if (!firstUrl) return;

    // Determine if it's a video or image
    const isVideo = finalVideos[0] || artifactVideos[0];

    // Open composer with the media
    openComposer({
      attachments: [
        {
          id: run.id,
          type: isVideo ? "video" : "photo",
          publicUrl: firstUrl,
          mimeType: isVideo ? "video/mp4" : "image/jpeg",
        },
      ],
    });

    toast.success("Media added to composer");
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-7xl min-w-[50vw] h-[90vh] p-0 flex flex-col">
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-6 p-6">
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {run.input.mode}
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

            {/* Summary/Message */}
            {run.output.message && (
              <div className="space-y-2 border-t pt-4">
                <h3 className="text-sm font-medium">Summary</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {run.output.message}
                </p>
              </div>
            )}

            {/* Error Message */}
            {run.output.error && (
              <div className="space-y-2 border-t pt-4">
                <h3 className="text-sm font-medium text-destructive">Error</h3>
                <p className="text-sm text-destructive/80 whitespace-pre-wrap font-mono text-xs bg-destructive/10 p-2 rounded">
                  {run.output.error}
                </p>
              </div>
            )}

            {/* Logs */}
            {run.logs && (
              <Collapsible defaultOpen={false}>
                <CollapsibleTrigger asChild>
                  <button className="flex w-full items-center justify-between py-3 text-sm font-semibold hover:bg-muted/50 rounded px-2 transition-colors">
                    <span>Logs</span>
                    <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2">
                  <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-64 text-muted-foreground font-mono whitespace-pre-wrap break-words">
                    {run.logs}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            )}

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
            {(artifactVideos.length > 0 ||
              artifactImages.length > 0 ||
              isGenerating) && (
              <Collapsible open={artifactsOpen} onOpenChange={setArtifactsOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex w-full items-center justify-between py-3 text-sm font-semibold hover:bg-muted/50 rounded px-2 transition-colors">
                    <div className="flex items-center gap-2">
                      <span>Generation Progress</span>
                      {isGenerating && (
                        <Badge
                          variant="outline"
                          className="text-xs px-1.5 py-0 h-auto animate-pulse"
                        >
                          In Progress
                        </Badge>
                      )}
                      {!isGenerating &&
                        (artifactVideos.length > 0 ||
                          artifactImages.length > 0) && (
                          <Badge
                            variant="secondary"
                            className="text-xs px-1.5 py-0 h-auto"
                          >
                            {artifactVideos.length + artifactImages.length}{" "}
                            steps
                          </Badge>
                        )}
                    </div>
                    <ChevronDown
                      className="h-4 w-4 transition-transform"
                      style={{
                        transform: artifactsOpen
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                      }}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3">
                  {artifactVideos.length === 0 &&
                    artifactImages.length === 0 &&
                    isGenerating && (
                      <p className="text-xs text-muted-foreground">
                        Waiting for intermediate outputs...
                      </p>
                    )}
                  {(artifactVideos.length > 0 || artifactImages.length > 0) && (
                    <>
                      <p className="text-xs text-muted-foreground">
                        {artifactVideos.length + artifactImages.length}{" "}
                        intermediate output
                        {artifactVideos.length + artifactImages.length !== 1
                          ? "s"
                          : ""}
                      </p>
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
                    </>
                  )}
                </CollapsibleContent>
              </Collapsible>
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
            <Button asChild variant="outline" size="sm">
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
            <Button asChild variant="outline" size="sm">
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
          {firstUrl && (
            <Button onClick={handleCreatePost} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Create post
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
