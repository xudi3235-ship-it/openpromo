import { type apiClient, useHonoMutation } from "@/lib/hono-client";

export function useSendInboxMessageMutation(
  workspaceSlug: string | undefined,
  conversationId: string | undefined,
) {
  return useHonoMutation<object, { text: string }>({
    mutationKey: ["inbox", "send", workspaceSlug, conversationId],
    mutationFn: (api: typeof apiClient, body) =>
      api.workspaces[":workspaceSlug"].inbox.conversations[
        ":conversationId"
      ].messages.$post({
        param: {
          workspaceSlug: String(workspaceSlug),
          conversationId: String(conversationId),
        },
        json: body,
      }),
  });
}
