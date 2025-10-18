import type { InboxMessagesList } from "@worker/routes/api/workspaces/inbox";
import {
  type apiClient,
  type UseHonoQueryOptions,
  useHonoQuery,
} from "@/lib/hono-client";

type InboxMessagesParams = {
  page: number;
  pageSize: number;
};

export function useInboxMessagesQuery(
  workspaceSlug: string | undefined,
  conversationId: string | undefined,
  params: InboxMessagesParams,
) {
  return useHonoQuery<InboxMessagesList>({
    enabled: Boolean(workspaceSlug && conversationId),
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
