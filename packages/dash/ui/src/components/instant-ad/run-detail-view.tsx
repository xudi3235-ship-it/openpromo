import { Button } from "@openpromo/ui/components/button";
import { ScrollArea } from "@openpromo/ui/components/scroll-area";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  SquarePen,
  Trash2,
} from "lucide-react";
import { useMemo } from "react";
import { useVideoGenAgentContext } from "@/features/instant-ad/video-gen-agent-provider";
import { useOpenComposer } from "@/hooks/useOpenComposer";
import { useRunAttachments } from "@/hooks/useRunAttachments";
import {
  useAgentRunQuery,
  useDeleteAgentRunsMutation,
} from "@/queries/agent-runs";
import { RunLivePanel } from "./run-live-panel";
import { RunPreview } from "./run-preview";

interface RunDetailViewProps {
  runId: string;
  workspaceSlug: string;
}

/**
 * Detail view for a single run.
 * Data comes from query cache (single source of truth).
 * WebSocket updates are written directly to cache by useVideoGenAgent.
 */
export function RunDetailView({ runId, workspaceSlug }: RunDetailViewProps) {
  const navigate = useNavigate();
  const deleteRunMutation = useDeleteAgentRunsMutation();
  const openComposer = useOpenComposer();

  // Query cache is the source of truth (updated by WebSocket)
  const { data: run, isPending, error } = useAgentRunQuery({ id: runId });

  // Only need to know if this is the active run for UI indicators
  const { activeRunId, isConnected } = useVideoGenAgentContext();
  const isActiveRun = activeRunId === runId && isConnected;

  const { attachments, isVideo, firstMediaUrl } = useRunAttachments(
    run ?? undefined,
  );

  // Get logs from run data (cache is kept up-to-date by WebSocket)
  const logs = useMemo(() => {
    if (!run?.logs) return [];
    return Array.isArray(run.logs) ? run.logs : [run.logs];
  }, [run?.logs]);

  const artifacts = run?.artifacts ?? { images: [], videos: [] };

  const handleBack = () => {
    navigate({
      to: "/workspaces/$workspaceSlug/instant-ad",
      params: { workspaceSlug },
      search: (prev) => ({ ...prev, runId: undefined }),
    });
  };

  const handleDownload = async () => {
    if (!run || !firstMediaUrl) {
      alert("No media found to download");
      return;
    }

    try {
      const response = await fetch(firstMediaUrl);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `run-${run.id}-${Date.now()}${isVideo ? ".mp4" : ".jpg"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to download media:", err);
      alert("Failed to download media");
    }
  };

  const handleDelete = async () => {
    if (!run || !confirm("Are you sure you want to delete this run?")) {
      return;
    }

    try {
      await deleteRunMutation.mutateAsync({ ids: [run.id] });
      handleBack();
    } catch (err) {
      console.error("Failed to delete run:", err);
    }
  };

  const handleCreatePost = () => {
    if (!run || attachments.length === 0) {
      alert("No media found to add to composer");
      return;
    }
    openComposer({ attachments });
  };

  // Loading state
  if (isPending && !run) {
    return (
      <div className="flex h-full w-full min-w-0 flex-col">
        <div className="flex items-center justify-between py-3 px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="p-2"
            >
              <ArrowLeft size={16} />
            </Button>
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="px-4 pb-4 pt-4">
            <div className="pb-6 flex justify-center">
              <Skeleton className="w-full max-w-[320px] sm:w-[280px] h-[400px] sm:h-[500px] rounded-2xl mx-auto" />
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Error state
  if (error || !run) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">
          {error?.message ?? "Run not found"}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleBack}
          className="mt-4"
        >
          Go Back
        </Button>
      </div>
    );
  }

  const isRunning = run.status === "running";

  return (
    <div className="flex h-full w-full min-w-0 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between py-2 px-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="p-1.5"
          >
            <ArrowLeft size={16} />
          </Button>
          <h3 className="text-sm font-medium">Run Details</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="text-muted-foreground hover:text-foreground sm:px-3"
          >
            <Download size={14} />
            <span className="hidden sm:inline ml-1.5">Download</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCreatePost}
            disabled={attachments.length === 0}
          >
            <SquarePen size={14} />
            <span className="hidden sm:inline">Create Post</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleteRunMutation.isPending}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 sm:px-3"
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="w-full max-w-6xl mx-auto px-3 py-2 sm:px-4 sm:py-3 space-y-4 sm:space-y-6">
          {/* Live panel for active running jobs */}
          {isActiveRun && isRunning && (
            <RunLivePanel logs={logs} artifacts={artifacts} />
          )}

          {/* Social Media Preview */}
          <div className="w-full">
            <div className="flex justify-center">
              <RunPreview run={run} className="w-full max-w-full" />
            </div>
            {/* Mobile Create Post Button */}
            <div className="mt-4 sm:hidden text-center">
              <Button
                onClick={handleCreatePost}
                disabled={attachments.length === 0}
                className="w-full max-w-xs"
                size="lg"
              >
                <SquarePen size={18} className="mr-2" />
                Create Post
              </Button>
              <p className="text-xs text-muted-foreground mt-1.5 px-4">
                Share your creation with your audience
              </p>
            </div>
          </div>

          {/* Information Card */}
          <div className="bg-card border rounded-lg sm:rounded-xl p-3 sm:p-4">
            <h4 className="text-sm font-medium mb-3 text-foreground">
              Run Information
            </h4>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 xl:gap-4">
              {/* Prompt Section */}
              <div>
                <h5 className="text-xs font-medium mb-1.5 text-muted-foreground uppercase tracking-wider">
                  Prompt
                </h5>
                <div className="bg-muted/50 rounded-md sm:rounded-lg p-2.5 sm:p-3">
                  <p className="text-sm text-muted-foreground break-words">
                    {run.input?.prompt || "No prompt available"}
                  </p>
                </div>
              </div>

              {/* Details Section */}
              <div>
                <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  Details
                </h5>
                <div className="bg-muted/30 rounded-md sm:rounded-lg p-2.5 sm:p-3">
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Type: </span>
                      <span className="font-medium capitalize">
                        {isVideo ? "Video" : "Image"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status: </span>
                      <span className="font-medium capitalize">
                        {run.status}
                      </span>
                      {isActiveRun && isRunning && (
                        <RefreshCw className="inline-block ml-1 h-3 w-3 animate-spin text-blue-500" />
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Created: </span>
                      <span className="font-medium">
                        {new Date(run.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Debug Output - dev only */}
            {run.output?.output && process.env.NODE_ENV === "development" && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 mb-2">
                  <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Debug Output
                  </h5>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 w-fit">
                    DEV ONLY
                  </span>
                </div>
                <div className="bg-muted/50 rounded-md sm:rounded-lg p-2.5 sm:p-3 overflow-x-auto">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono max-h-96 overflow-auto break-all">
                    {JSON.stringify(run, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
