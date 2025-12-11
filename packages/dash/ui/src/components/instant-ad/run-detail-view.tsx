import { Button } from "@openpromo/ui/components/button";
import { ScrollArea } from "@openpromo/ui/components/scroll-area";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  SquarePen,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useVideoGenAgentContext } from "@/features/instant-ad/video-gen-agent-provider";
import { useOpenComposer } from "@/hooks/useOpenComposer";
import { useRunAttachments } from "@/hooks/useRunAttachments";
import { orpc } from "@/lib/orpc-client";
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

export function RunDetailView({ runId, workspaceSlug }: RunDetailViewProps) {
  const navigate = useNavigate();
  const deleteRunMutation = useDeleteAgentRunsMutation();
  const openComposer = useOpenComposer();
  const queryClient = useQueryClient();
  const [lastRunSnapshot, setLastRunSnapshot] = useState<typeof run | null>(
    null,
  );

  // Fetch run data using the specific query
  const {
    data: run,
    isPending,
    error,
    // refetch,
  } = useAgentRunQuery({ id: runId });

  // Get attachments from run data
  const { serverState, isConnected } = useVideoGenAgentContext();

  const liveRun = useMemo(() => {
    if (!run) return run;

    if (serverState.runId === runId && isConnected) {
      return {
        ...run,
        status: serverState.status,
        artifacts: serverState.artifacts,
        output: serverState.output,
        logs: serverState.logs,
        input: serverState.input,
        updatedAt: new Date(serverState.lastUpdated),
      };
    }

    return run;
  }, [isConnected, run, runId, serverState]);

  const displayRun = liveRun ?? run ?? lastRunSnapshot;

  useEffect(() => {
    if (liveRun) {
      setLastRunSnapshot(liveRun);
    } else if (run) {
      setLastRunSnapshot(run);
    }
  }, [liveRun, run]);

  const { attachments, isVideo, firstMediaUrl } = useRunAttachments(
    displayRun ?? undefined,
  );

  // Merge latest server state into cached query when this run is active
  const isActiveRun = serverState.runId === runId && isConnected;

  const liveLogs = useMemo(() => {
    if (isActiveRun) return serverState.logs;
    if (!run) return [];
    if (Array.isArray(run.logs)) return run.logs;
    return run.logs ? [run.logs] : [];
  }, [isActiveRun, run, serverState.logs]);

  const liveArtifacts = isActiveRun
    ? serverState.artifacts
    : (run?.artifacts ?? { images: [], videos: [] });

  useEffect(() => {
    if (!isActiveRun) return;

    queryClient.setQueryData(
      orpc.agentRuns.get.key({ input: { id: runId, workspaceSlug } }),
      (oldData: typeof run) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          status: serverState.status,
          output: serverState.output,
          artifacts: serverState.artifacts,
          logs: serverState.logs,
          input: serverState.input,
          updatedAt: new Date(serverState.lastUpdated),
        };
      },
    );
  }, [isActiveRun, queryClient, runId, serverState, workspaceSlug]);

  const handleBack = () => {
    navigate({
      to: "/workspaces/$workspaceSlug/instant-ad",
      params: { workspaceSlug },
      search: (prev) => ({ ...prev, runId: undefined }),
    });
  };

  const handleDownload = async () => {
    const currentRun = displayRun;
    if (!currentRun) return;

    if (!firstMediaUrl) {
      alert("No media found to download");
      return;
    }

    try {
      const response = await fetch(firstMediaUrl);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `run-${currentRun.id}-${Date.now()}${isVideo ? ".mp4" : ".jpg"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to download media:", error);
      alert("Failed to download media");
    }
  };

  const handleDelete = async () => {
    const currentRun = displayRun;

    if (!currentRun || !confirm("Are you sure you want to delete this run?")) {
      return;
    }

    try {
      await deleteRunMutation.mutateAsync({ ids: [currentRun.id] });
      handleBack(); // Go back to list after successful delete
    } catch (error) {
      console.error("Failed to delete run:", error);
    }
  };

  const handleCreatePost = () => {
    if (!displayRun) return;

    if (attachments.length === 0) {
      alert("No media found to add to composer");
      return;
    }
    // Open composer with the media
    openComposer({
      attachments,
    });
  };

  // Show loading state
  if (isPending && !displayRun) {
    return (
      <div className="flex h-full w-full min-w-0 flex-col">
        {/* Header */}
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
            <div>
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>

        {/* Loading Content */}
        <ScrollArea className="min-h-0 flex-1">
          <div className="px-4 pb-4 pt-4">
            {/* Preview Skeleton */}
            <div className="pb-6 flex justify-center">
              <Skeleton className="w-full max-w-[320px] sm:w-[280px] h-[400px] sm:h-[500px] rounded-2xl mx-auto" />
            </div>

            {/* Details Skeleton */}
            <div className="w-full max-w-4xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                {/* Left Column Skeleton */}
                <div className="lg:col-span-2 min-w-0">
                  <div className="mb-6">
                    <Skeleton className="h-4 w-16 mb-3" />
                    <div className="bg-muted/50 rounded-lg p-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4 mt-2" />
                    </div>
                  </div>
                </div>

                {/* Right Column Skeleton */}
                <div className="min-w-0">
                  <div className="mb-6">
                    <Skeleton className="h-4 w-20 mb-3" />
                    <div className="bg-muted/30 rounded-lg p-4">
                      <div className="space-y-3">
                        <div>
                          <Skeleton className="h-3 w-16 mb-1" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <div>
                          <Skeleton className="h-3 w-12 mb-1" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                        <div>
                          <Skeleton className="h-3 w-10 mb-1" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                        <div>
                          <Skeleton className="h-3 w-14 mb-1" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Show error state
  if ((error && !displayRun) || (!displayRun && !isPending)) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">
          {error ? error.message : "Run not found"}
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

  if (!displayRun) {
    return null;
  }

  const displayStatus = isActiveRun ? serverState.status : displayRun.status;
  const displayMode = isActiveRun
    ? serverState.input.mode
    : displayRun.input.mode;

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
          <div>
            <h3 className="text-sm font-medium">Run Details</h3>
          </div>
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
            variant="outline"
            size="sm"
            onClick={handleCreatePost}
            disabled={attachments.length === 0}
            className="flex items-center gap-2 border-primary text-primary hover:bg-primary/5 sm:px-3"
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
          {isActiveRun && serverState.status === "running" && (
            <RunLivePanel logs={liveLogs} artifacts={liveArtifacts} />
          )}

          {/* Social Media Preview */}
          {displayRun && (
            <div className="w-full">
              <div className="flex justify-center">
                <RunPreview run={displayRun} className="w-full max-w-full" />
              </div>
              {/* Mobile Create Post Button - shown only on small screens */}
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
          )}

          {/* Information Card - Combined prompt and details */}
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
                    {displayRun.input?.prompt || "No prompt available"}
                  </p>
                </div>
              </div>

              {/* Details Section */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
                  <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Details
                  </h5>
                  {/* Real-time connection indicator */}
                  <div className="flex items-center gap-1 text-xs">
                    {isConnected && isActiveRun ? (
                      <>
                        <Wifi className="h-3 w-3 text-green-500" />
                        <span className="text-green-600 dark:text-green-400">
                          Live updates
                        </span>
                      </>
                    ) : isConnected ? (
                      <>
                        <Wifi className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Connected</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Offline</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="bg-muted/30 rounded-md sm:rounded-lg p-2.5 sm:p-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">
                        Created:
                      </span>
                      <p className="font-medium mt-0.5 text-xs">
                        {new Date(displayRun.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">
                        Type:
                      </span>
                      <p className="font-medium mt-0.5 text-xs capitalize">
                        {isVideo ? "Video" : "Image"}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground text-xs">
                        Status:
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="font-medium text-xs capitalize">
                          {displayStatus}
                        </p>
                        {isActiveRun && (
                          <div className="flex items-center gap-1">
                            <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
                            <span className="text-xs text-blue-600 dark:text-blue-400">
                              {serverState.status === "running"
                                ? "Processing..."
                                : serverState.status}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground text-xs">
                        Mode:
                      </span>
                      <p className="font-medium mt-0.5 text-xs">
                        {displayMode}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Output Details - only show in dev */}
            {displayRun.output.output &&
              process.env.NODE_ENV === "development" && (
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
                      {JSON.stringify(displayRun, null, 2)}
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
