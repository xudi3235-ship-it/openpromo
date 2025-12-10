import { Badge } from "@openpromo/ui/components/badge";
import { ScrollArea } from "@openpromo/ui/components/scroll-area";
import { Separator } from "@openpromo/ui/components/separator";
import type { VideoGenRealtime } from "@shared";

interface RunLivePanelProps {
  logs: string[];
  artifacts: VideoGenRealtime.ServerAppState["artifacts"];
}

export function RunLivePanel({ logs, artifacts }: RunLivePanelProps) {
  const hasVideos = artifacts.videos.length > 0;
  const hasImages = artifacts.images.length > 0;

  return (
    <div className="bg-card border rounded-lg sm:rounded-xl p-3 sm:p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium">Live Run</h4>
          <Badge variant="secondary" className="text-xs">
            Running
          </Badge>
        </div>
        <span className="text-[11px] text-muted-foreground">Auto-updating</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 xl:gap-4">
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Logs
          </div>
          <div className="rounded-md border bg-muted/40">
            <ScrollArea className="h-48 p-3">
              {logs.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Waiting for logs...
                </p>
              ) : (
                <div className="space-y-1">
                  {logs.map((line, idx) => (
                    <p
                      key={`${idx}-${line.slice(0, 12)}`}
                      className="text-xs font-mono text-foreground/80 break-words"
                    >
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Artifacts
          </div>
          <div className="rounded-md border bg-muted/40 p-3 space-y-2">
            {!hasVideos && !hasImages ? (
              <p className="text-xs text-muted-foreground">No artifacts yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {artifacts.videos.map((video) => (
                  <div
                    key={video.id}
                    className="overflow-hidden rounded-md border bg-background"
                  >
                    <video
                      src={video.videoUrl}
                      controls
                      playsInline
                      muted
                      className="w-full h-full max-h-40 object-cover"
                    />
                  </div>
                ))}
                {hasVideos && hasImages && <Separator className="col-span-2" />}
                {artifacts.images.map((image) => (
                  <div
                    key={image.id}
                    className="overflow-hidden rounded-md border bg-background"
                  >
                    <img
                      src={image.imageUrl}
                      alt="Generated artifact"
                      className="w-full h-full max-h-40 object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
