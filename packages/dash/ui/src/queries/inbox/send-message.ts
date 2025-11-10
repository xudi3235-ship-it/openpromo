import type { UseMutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type {
  InboxRouterInputs,
  InboxRouterOutputs,
} from "@worker/orpc/routes/inbox";
import { useWorkspace } from "@/hooks/useWorkspace";
import { orpc } from "@/lib/orpc-client";

type SendMessageInput = InboxRouterInputs["sendMessage"];
type SendMessageOutput = InboxRouterOutputs["sendMessage"];
export type SendMessageVariables = SendMessageInput["body"];

export function useSendInboxMessageMutation<TContext = unknown>(
  conversationId: string | undefined,
  options?: Omit<
    UseMutationOptions<
      SendMessageOutput,
      Error,
      SendMessageVariables,
      TContext
    >,
    "mutationFn" | "mutationKey"
  >,
) {
  const { workspace } = useWorkspace();

  return useMutation<SendMessageOutput, Error, SendMessageVariables, TContext>({
    mutationKey: ["inbox", "send", workspace.slug, conversationId],
    mutationFn: async (body) => {
      if (!workspace.slug || !conversationId) {
        throw new Error("Missing workspace or conversation context");
      }

      return orpc.inbox.sendMessage.call({
        workspaceSlug: workspace.slug,
        conversationId,
        body,
      });
    },
    ...options,
  });
}
