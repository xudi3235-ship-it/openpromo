import type {
  InboxConversationsList,
  InboxMessagesList,
} from "@worker/routes/api/workspaces/inbox";
import {
  type apiClient,
  type UseHonoQueryOptions,
  useHonoMutation,
  useHonoQuery,
} from "@/lib/hono-client";

export function useInboxConversations(
  workspaceSlug: string | undefined,
  params: {
    page: number;
    pageSize: number;
    q?: string;
    platform?: "FACEBOOK" | "INSTAGRAM" | "TIKTOK";
    connectedAccountId?: string;
  },
) {
  return useHonoQuery<InboxConversationsList>({
    enabled: !!workspaceSlug,
    queryKey: ["inbox", "conversations", workspaceSlug, params],
    queryFn: (api: typeof apiClient) =>
      api.workspaces[":workspaceSlug"].inbox.conversations.$get({
        param: { workspaceSlug: String(workspaceSlug) },
        query: {
          ...params,
          page: params.page.toString(),
          pageSize: params.pageSize.toString(),
        },
      }),
  } as unknown as UseHonoQueryOptions<InboxConversationsList>);
}

export function useInboxMessages(
  workspaceSlug: string | undefined,
  conversationId: string | undefined,
  params: { page: number; pageSize: number },
) {
  return useHonoQuery<InboxMessagesList>({
    enabled: !!workspaceSlug && !!conversationId,
    queryKey: [
      "inbox",
      "messages",
      workspaceSlug,
      conversationId,
      params.page,
      params.pageSize,
    ],
    queryFn: (api: typeof apiClient) =>
      api.workspaces[":workspaceSlug"].inbox.conversations[
        ":conversationId"
      ].messages.$get({
        param: {
          workspaceSlug: String(workspaceSlug),
          conversationId: String(conversationId),
        },
        query: {
          ...params,
          page: params.page.toString(),
          pageSize: params.pageSize.toString(),
        },
      }),
  } as unknown as UseHonoQueryOptions<InboxMessagesList>);
}

export function useSendInboxMessage(
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
