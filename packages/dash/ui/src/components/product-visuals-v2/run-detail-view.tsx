import { Button } from "@openpromo/ui/components/button";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, FileText, Trash2 } from "lucide-react";
import {
  useAgentRunQuery,
  useDeleteAgentRunsMutation,
} from "@/queries/agent-runs";

interface RunDetailViewProps {
  runId: string;
  workspaceSlug: string;
}

export function RunDetailView({ runId, workspaceSlug }: RunDetailViewProps) {
  const navigate = useNavigate();
  const deleteRunMutation = useDeleteAgentRunsMutation();

  // Fetch run data using the specific query
  const { data: run, isPending, error } = useAgentRunQuery({ id: runId });

  const handleBack = () => {
    navigate({
      to: "/workspaces/$workspaceSlug/instant-ad",
      params: { workspaceSlug },
      search: (prev) => ({ ...prev, runId: undefined }),
    });
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

  const isVideo =
    run?.output.output?.videos?.[0] || run?.artifacts?.videos?.[0];
  const mediaUrl =
    isVideo?.videoUrl ||
    run?.output.output?.images?.[0]?.imageUrl ||
    run?.artifacts?.images?.[0]?.imageUrl;

  // Show loading state
  if (isPending) {
    return (
      <div className="flex h-full min-w-0 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
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
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-6">
            {/* Media Preview Skeleton */}
            <div>
              <Skeleton className="w-full h-96 rounded-lg" />
            </div>

            {/* Input Section Skeleton */}
            <div>
              <Skeleton className="h-4 w-16 mb-2" />
              <div className="bg-muted/50 rounded-lg p-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4 mt-1" />
              </div>
            </div>

            {/* Metadata Section Skeleton */}
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            </div>
          </div>
        </div>
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
    <div className="flex h-full min-w-0 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
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
            variant="outline"
            size="sm"
            onClick={handleCreatePost}
            className="flex items-center gap-2"
          >
            <FileText size={14} />
            Create Post
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleteRunMutation.isPending}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:border-red-300"
          >
            <Trash2 size={14} />
            Delete
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Media Preview */}
        {mediaUrl && (
          <div className="mb-6">
            <div className="rounded-lg border overflow-hidden bg-gray-50">
              {isVideo ? (
                <video
                  src={mediaUrl}
                  controls
                  className="w-full h-auto max-h-96 object-contain"
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt="Generated content"
                  className="w-full h-auto max-h-96 object-contain"
                />
              )}
            </div>
          </div>
        )}

        {/* Run Details */}
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Input</h4>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">
                {run.input?.prompt || "No prompt available"}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Metadata</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Created:</span>
                <span>{new Date(run.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status:</span>
                <span className="capitalize">{run.status}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Type:</span>
                <span>{isVideo ? "Video" : "Image"}</span>
              </div>
            </div>
          </div>

          {/* Output Details */}
          {run.output.output && (
            <div>
              <h4 className="text-sm font-medium mb-2">Output</h4>
              <div className="bg-muted/50 rounded-lg p-3">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {JSON.stringify(run.output.output, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
