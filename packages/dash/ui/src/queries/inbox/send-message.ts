import type { UseMutationOptions } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";
import { type apiClient, useHonoMutation } from "@/lib/hono-client";

type SendMessageRoute =
  (typeof apiClient)["workspaces"][":workspaceSlug"]["inbox"]["conversations"][":conversationId"]["messages"]["$post"];

type SendMessageResponse = InferResponseType<SendMessageRoute>;
type SendMessageRequest = InferRequestType<SendMessageRoute>;
type SendMessageVariables = SendMessageRequest["json"];

export function useSendInboxMessageMutation<TContext = unknown>(
  workspaceSlug: string | undefined,
  conversationId: string | undefined,
  options?: Omit<
    UseMutationOptions<
      SendMessageResponse,
      Error,
      SendMessageVariables,
      TContext
    >,
    "mutationFn" | "mutationKey"
  >,
) {
  return useHonoMutation<SendMessageResponse, SendMessageVariables, TContext>({
    mutationKey: ["inbox", "send", workspaceSlug, conversationId],
    mutationFn: (api: typeof apiClient, body) => {
      if (!workspaceSlug || !conversationId) {
        throw new Error("Missing workspace or conversation context");
      }

      return api.workspaces[":workspaceSlug"].inbox.conversations[
        ":conversationId"
      ].messages.$post({
        param: {
          workspaceSlug: String(workspaceSlug),
          conversationId: String(conversationId),
        },
        json: body satisfies SendMessageVariables,
      });
    },
    ...options,
  });
}
