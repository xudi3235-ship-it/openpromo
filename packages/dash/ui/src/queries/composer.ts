import { useHonoMutation } from "@/lib/hono-client";

export const useComposerPublishMutation = () => {
  return useHonoMutation({
    // @ts-expect-error WIP
    mutationFn(api) {
      return api.workspaces[":workspaceSlug"].content.create;
    },
  });
};
