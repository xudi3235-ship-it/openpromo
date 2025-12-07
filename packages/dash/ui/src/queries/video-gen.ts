import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { orpc } from "@/lib/orpc-client";
import type {
  ProductVisualsVideoRouterInputs,
  ProductVisualsVideoRouterOutputs,
} from "../../../worker/src/orpc/routes/product-visuals-video";
import type {
  VideoGenRouterInputs,
  VideoGenRouterOutputs,
} from "../../../worker/src/orpc/routes/video-gen";

// ============ Workflow-based video generation ============

export type VideoGenStartInput = Omit<
  VideoGenRouterInputs["start"],
  "workspaceId" | "workspaceSlug"
>;
export type VideoGenStartResponse = VideoGenRouterOutputs["start"];

export type VideoGenGetInput = Omit<
  VideoGenRouterInputs["get"],
  "workspaceId" | "workspaceSlug"
>;
export type VideoGenGetResponse = VideoGenRouterOutputs["get"];

export type VideoGenDeleteBatchInput = Omit<
  VideoGenRouterInputs["deleteBatch"],
  "workspaceId" | "workspaceSlug"
>;
export type VideoGenDeleteBatchResponse = VideoGenRouterOutputs["deleteBatch"];

export type ProductVisualsVideoStartInput = Omit<
  ProductVisualsVideoRouterInputs["start"],
  "workspaceId" | "workspaceSlug"
>;
export type ProductVisualsVideoStartResponse =
  ProductVisualsVideoRouterOutputs["start"];

/**
 * Hook to start a video generation workflow.
 * Creates a generation record and kicks off the Cloudflare Workflow.
 * Status updates are received via WebSocket events.
 */
export const useVideoGenStartMutation = (
  onSuccess?: (
    data: VideoGenStartResponse,
    variables: VideoGenStartInput,
  ) => void,
) => {
  const { workspace } = useWorkspace();

  return useMutation<VideoGenStartResponse, Error, VideoGenStartInput>({
    mutationFn: async (variables) =>
      orpc.videoGen.start.call({
        ...variables,
        workspaceSlug: workspace.slug,
      }),
    onSuccess: (data, variables) => {
      toast.success("Video generation started");
      onSuccess?.(data, variables);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start video generation");
    },
  });
};

export const useProductVisualsVideoStartMutation = (
  onSuccess?: (
    data: ProductVisualsVideoStartResponse,
    variables: ProductVisualsVideoStartInput,
  ) => void,
) => {
  const { workspace } = useWorkspace();

  return useMutation<
    ProductVisualsVideoStartResponse,
    Error,
    ProductVisualsVideoStartInput
  >({
    mutationFn: async (variables) =>
      orpc.productVisualsVideo.start.call({
        ...variables,
        workspaceSlug: workspace.slug,
      }),
    onSuccess: (data, variables) => {
      toast.success("Video generation started");
      onSuccess?.(data, variables);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start video generation");
    },
  });
};

/**
 * Hook to delete video generations in batch.
 */
export const useVideoGenDeleteBatchMutation = (onSuccess?: () => void) => {
  const { workspace } = useWorkspace();

  return useMutation<
    VideoGenDeleteBatchResponse,
    Error,
    VideoGenDeleteBatchInput
  >({
    mutationFn: async (variables) =>
      orpc.videoGen.deleteBatch.call({
        ...variables,
        workspaceSlug: workspace.slug,
      }),
    onSuccess: async (data) => {
      toast.success(
        `Deleted ${data.deletedCount} video${data.deletedCount !== 1 ? "s" : ""}`,
      );
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete videos");
    },
  });
};
