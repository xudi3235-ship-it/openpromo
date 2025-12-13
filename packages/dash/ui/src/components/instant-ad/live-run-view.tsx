import { Button } from "@openpromo/ui/components/button";
import type { VideoGenRealtime } from "@shared";
import { ArrowLeft } from "lucide-react";
import { LiveArtifactsGrid } from "./live-artifacts-grid";
import { LiveLogsPanel } from "./live-logs-panel";

interface LiveRunViewProps {
  logs: string[];
  artifacts: VideoGenRealtime.ServerAppState["artifacts"];
  onBack: () => void;
}

/**
 * Full-screen immersive view for active video generation runs.
 * "Mission control" experience: artifacts streaming in + live logs.
 */
export function LiveRunView({ logs, artifacts, onBack }: LiveRunViewProps) {
  return (
    <div className="flex h-full w-full min-w-0 flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-1.5">
            <ArrowLeft size={16} />
          </Button>
          <div className="flex items-center gap-2">
            <div className="relative h-2 w-2">
              <div className="absolute inset-0 bg-blue-500/60 rounded-full animate-ping" />
              <div className="relative h-2 w-2 bg-blue-500 rounded-full" />
            </div>
            <span className="text-sm font-medium">Generating</span>
          </div>
        </div>
        <span className="text-xs text-muted-foreground/60">Live</span>
      </div>

      {/* Artifacts area - takes available space */}
      <LiveArtifactsGrid artifacts={artifacts} className="flex-1 min-h-0" />

      {/* Logs panel - fixed height at bottom */}
      <LiveLogsPanel logs={logs} className="h-64 shrink-0" />
    </div>
  );
}
