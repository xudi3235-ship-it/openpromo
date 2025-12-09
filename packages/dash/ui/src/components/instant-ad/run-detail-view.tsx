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
import { useOpenComposer } from "@/hooks/useOpenComposer";
import { useRunAttachments } from "@/hooks/useRunAttachments";
import { useVideoGenAgent } from "@/hooks/useVideoGenAgent";
import { orpc } from "@/lib/orpc-client";
import {
  useAgentRunQuery,
  useDeleteAgentRunsMutation,
} from "@/queries/agent-runs";
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

  // Fetch run data using the specific query
  const {
    data: run,
    isPending,
    error,
    // refetch,
  } = useAgentRunQuery({ id: runId });

  // Get attachments from run data
  const { attachments, isVideo, firstMediaUrl } = useRunAttachments(run);

  // Set up real-time updates for running runs
  const { serverState, isConnected } = useVideoGenAgent({
    onEvent: {
      // Update run data when we receive sync_state event
      sync_state: async (data) => {
        if (data.state.runId !== runId) {
          return;
        }
        // Merge the latest data from sync_state into the cached query data
        queryClient.setQueryData(
          orpc.agentRuns.get.key({ input: { id: runId, workspaceSlug } }),
          (oldData: typeof run) => {
            if (!oldData) return oldData;

            // Merge the server state with the existing run data
            return {
              ...oldData,
              status: data.state.status,
              output: data.state.output,
              artifacts: data.state.artifacts,
              updatedAt: data.state.lastUpdated,
            };
          },
        );
      },
    },
  });

  // Check if this run is currently active in the agent
  const isActiveRun = serverState.runId === runId && isConnected;

  const handleBack = () => {
    navigate({
      to: "/workspaces/$workspaceSlug/instant-ad",
      params: { workspaceSlug },
      search: (prev) => ({ ...prev, runId: undefined }),
    });
  };

  const handleDownload = async () => {
    if (!run) return;

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
      a.download = `run-${run.id}-${Date.now()}${isVideo ? ".mp4" : ".jpg"}`;
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
    if (!run || !confirm("Are you sure you want to delete this run?")) {
      return;
    }

    try {
      await deleteRunMutation.mutateAsync({ ids: [run.id] });
      handleBack(); // Go back to list after successful delete
    } catch (error) {
      console.error("Failed to delete run:", error);
    }
  };

  const handleCreatePost = () => {
    if (!run) return;

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
  if (isPending) {
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
              <Skeleton className="w-[280px] h-[500px] rounded-2xl" />
            </div>

            {/* Details Skeleton */}
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-8">
                {/* Left Column Skeleton */}
                <div className="flex-1 min-w-0">
                  <div className="mb-6">
                    <Skeleton className="h-4 w-16 mb-3" />
                    <div className="bg-muted/50 rounded-lg p-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4 mt-2" />
                    </div>
                  </div>
                </div>

                {/* Right Column Skeleton */}
                <div className="w-80 flex-shrink-0">
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
  if (error || !run) {
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
            <h3 className="text-sm font-medium">Run Details</h3>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="text-muted-foreground hover:text-foreground"
          >
            <Download size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleteRunMutation.isPending}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 size={14} />
            Delete
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
          {/* Social Media Preview */}
          {run && (
            <div className="w-full overflow-x-auto pb-4">
              <div className="min-w-max flex justify-center">
                <RunPreview run={run} className="w-fit" />
              </div>
            </div>
          )}

          {/* Call to Action - Single prominent CTA */}
          {run && (
            <div className="text-center">
              <Button
                onClick={handleCreatePost}
                size="lg"
                disabled={attachments.length === 0}
                className="min-w-[200px]"
              >
                <SquarePen size={18} className="mr-2" />
                Create Post
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Share your creation with your audience
              </p>
            </div>
          )}

          {/* Information Card - Combined prompt and details */}
          <div className="bg-card border rounded-xl p-6">
            <h4 className="text-sm font-medium mb-4 text-foreground">
              Run Information
            </h4>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Prompt Section */}
              <div>
                <h5 className="text-xs font-medium mb-2 text-muted-foreground uppercase tracking-wider">
                  Prompt
                </h5>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">
                    {run.input?.prompt || "No prompt available"}
                  </p>
                </div>
              </div>

              {/* Details Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
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
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">
                        Created:
                      </span>
                      <p className="font-medium mt-0.5 text-xs">
                        {new Date(run.createdAt).toLocaleString()}
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
                    <div className="col-span-2">
                      <span className="text-muted-foreground text-xs">
                        Status:
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="font-medium text-xs capitalize">
                          {run.status}
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
                    <div className="col-span-2">
                      <span className="text-muted-foreground text-xs">
                        Mode:
                      </span>
                      <p className="font-medium mt-0.5 text-xs">
                        {run.input.mode}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Output Details - only show in dev */}
            {run.output.output && process.env.NODE_ENV === "development" && (
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center gap-2 mb-3">
                  <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Debug Output
                  </h5>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                    DEV ONLY
                  </span>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono max-h-96 overflow-auto">
                    {JSON.stringify(run.output, null, 2)}
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
