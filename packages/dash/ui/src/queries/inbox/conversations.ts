import type { InboxPlatform } from "@shared/inbox";
import type { InboxConversationsList } from "@worker/routes/api/workspaces/inbox";
import { useMemo } from "react";
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

type InboxConversationsQueryOptions = {
  onError?: (error: unknown) => void;
};

export function useInboxConversationsQuery(
  workspaceSlug: string | undefined,
  params: InboxConversationsParams,
  options: InboxConversationsQueryOptions = {},
) {
  const { onError } = options;
  const { data, ...rest } = useHonoQuery<InboxConversationsList>({
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
    onError,
  } as unknown as UseHonoQueryOptions<InboxConversationsList>);

  const parsedData = useMemo(() => {
    if (!data) return undefined;
    return {
      ...data,
      items: data.items.map((item) => ({
        ...item,
        lastMessageAt: new Date(item.lastMessageAt),
      })),
    };
  }, [data]);

  return { data: parsedData, ...rest };
}
