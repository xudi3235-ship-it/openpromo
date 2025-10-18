import type { InboxPlatform } from "@shared/inbox";
import type { InboxConversationsList } from "@worker/routes/api/workspaces/inbox";
import {
  type apiClient,
  type UseHonoQueryOptions,
  useHonoQuery,
} from "@/lib/hono-client";

type InboxConversationsParams = {
  page: number;
  pageSize: number;
  q?: string;
  platform?: InboxPlatform;
  channel?: "dm" | "post_comment";
  connectedAccountId?: string;
};

export function useInboxConversationsQuery(
  workspaceSlug: string | undefined,
  params: InboxConversationsParams,
) {
  return useHonoQuery<InboxConversationsList>({
    enabled: Boolean(workspaceSlug),
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
