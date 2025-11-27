import {
  type UseQueryOptions,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { orpc } from "@/lib/orpc-client";
import type {
  VideoGenRouterInputs,
  VideoGenRouterOutputs,
} from "../../../worker/src/orpc/routes/video-gen";

export type VideoGenSubmitInput = Omit<
  VideoGenRouterInputs["submit"],
  "workspaceId" | "workspaceSlug"
>;
export type VideoGenSubmitResponse = VideoGenRouterOutputs["submit"];

export type VideoGenStatusInput = Omit<
  VideoGenRouterInputs["status"],
  "workspaceId" | "workspaceSlug"
>;
export type VideoGenStatusResponse = VideoGenRouterOutputs["status"];

export const useVideoGenSubmitMutation = (
  onSuccess?: (
    data: VideoGenSubmitResponse,
    variables: VideoGenSubmitInput,
  ) => void,
) => {
  const { workspace } = useWorkspace();

  return useMutation<VideoGenSubmitResponse, Error, VideoGenSubmitInput>({
    mutationFn: async (variables) =>
      orpc.videoGen.submit.call({
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

type StatusQueryOptions = Pick<
  UseQueryOptions<VideoGenStatusResponse, Error>,
  "enabled" | "refetchInterval"
>;

export const useVideoGenStatusQuery = (
  input: VideoGenStatusInput | null,
  options?: StatusQueryOptions,
) => {
  const { workspace } = useWorkspace();

  const queryOptions = orpc.videoGen.status.queryOptions({
    input: {
      workspaceSlug: workspace.slug,
      callId: input?.callId ?? "",
    },
  });

  return useQuery({
    ...queryOptions,
    enabled:
      Boolean(input?.callId) &&
      (options?.enabled ?? queryOptions.enabled ?? true),
    refetchInterval: options?.refetchInterval,
  });
};
