import { Button } from "@openpromo/ui/components/button";
import { ScrollArea } from "@openpromo/ui/components/scroll-area";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Download, SquarePen, Trash2 } from "lucide-react";
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

  // Fetch run data using the specific query
  const { data: run, isPending, error } = useAgentRunQuery({ id: runId });

  // Get media type for metadata display
  const isVideo =
    run?.output.output?.videos?.[0] || run?.artifacts?.videos?.[0];

  const handleBack = () => {
    navigate({
      to: "/workspaces/$workspaceSlug/instant-ad",
      params: { workspaceSlug },
      search: (prev) => ({ ...prev, runId: undefined }),
    });
  };

  const handleDownload = async () => {
    if (!run) return;

    const isVideo =
      run.output.output?.videos?.[0] || run.artifacts?.videos?.[0];
    const url =
      isVideo?.videoUrl ||
      run.output.output?.images?.[0]?.imageUrl ||
      run.artifacts?.images?.[0]?.imageUrl;

    if (!url) {
      alert("No media found to download");
      return;
    }

    try {
      const response = await fetch(url);
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

    const isVideo =
      run.output.output?.videos?.[0] || run.artifacts?.videos?.[0];
    const url =
      isVideo?.videoUrl ||
      run.output.output?.images?.[0]?.imageUrl ||
      run.artifacts?.images?.[0]?.imageUrl;

    if (!url) {
      alert("No media found to add to composer");
      return;
    }

    const attachments = [
      {
        id: run.id,
        type: isVideo ? ("video" as const) : ("photo" as const),
        publicUrl: url,
        mimeType: isVideo ? "video/mp4" : "image/jpeg",
        source: "remote" as const,
      },
    ];

    // Navigate to composer with the media
    navigate({
      to: "/workspaces/$workspaceSlug/composer",
      params: { workspaceSlug },
      search: { attachments: JSON.stringify(attachments) },
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
            onClick={handleCreatePost}
            size="sm"
            variant="ghost"
            className="flex items-center gap-2"
          >
            <SquarePen size={14} />
            Create Post
          </Button>
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
        <div className="px-4 pb-4 pt-4">
          {/* Social Media Previews */}
          {run && (
            <div className="pb-6 flex justify-center">
              <RunPreview run={run} />
            </div>
          )}

          {/* Call to Action - Post to Social */}
          {run && (
            <div className="mb-8 max-w-2xl mx-auto text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Share your creation with your audience instantly
              </p>
              <Button onClick={handleCreatePost} size="lg">
                <SquarePen size={18} className="mr-2" />
                Post to Social Accounts
              </Button>
            </div>
          )}

          {/* Details Section */}
          {run && (
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-8">
                {/* Left Column - Prompt */}
                <div className="flex-1 min-w-0">
                  <div className="mb-6">
                    <h4 className="text-sm font-medium mb-3 text-foreground">
                      Prompt
                    </h4>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">
                        {run.input?.prompt || "No prompt available"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column - Metadata */}
                <div className="w-80 flex-shrink-0">
                  <div className="mb-6">
                    <h4 className="text-sm font-medium mb-3 text-foreground">
                      Information
                    </h4>
                    <div className="bg-muted/30 rounded-lg p-4">
                      <div className="space-y-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            Created:
                          </span>
                          <p className="font-medium mt-1">
                            {new Date(run.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status:</span>
                          <p className="capitalize font-medium mt-1">
                            {run.status}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Type:</span>
                          <p className="font-medium mt-1">
                            {isVideo ? "Video" : "Image"}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Agent:</span>
                          <p className="font-medium mt-1">{run.agentName}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Output Details - only show in dev */}
                  {run.output.output &&
                    process.env.NODE_ENV === "development" && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <h4 className="text-sm font-medium text-foreground">
                            Debug Output
                          </h4>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                            DEV ONLY
                          </span>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-4">
                          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono max-h-96 overflow-auto">
                            {JSON.stringify(run.output.output, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
