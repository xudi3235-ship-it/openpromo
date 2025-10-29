import type { QueryClient } from "@tanstack/react-query";
import type { InboxMessagesList } from "@worker/routes/api/workspaces/inbox";
import { useMemo } from "react";
import {
  apiClient,
  type UseHonoQueryOptions,
  useHonoQuery,
} from "@/lib/hono-client";

type InboxMessagesParams = {
  page: number;
  pageSize: number;
};

type InboxMessagesQueryOptions = {
  onError?: (error: unknown) => void;
};

export function useInboxMessagesQuery(
  workspaceSlug: string | undefined,
  conversationId: string | undefined,
  params: InboxMessagesParams,
  options: InboxMessagesQueryOptions = {},
) {
  const { onError } = options;
  const { data, ...rest } = useHonoQuery<InboxMessagesList>({
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
    onError,
  } as unknown as UseHonoQueryOptions<InboxMessagesList>);

  const parsedData = useMemo(() => {
    if (!data) return undefined;
    return {
      ...data,
      items: data.items.map((item) => ({
        ...item,
        createdAt: new Date(item.createdAt),
      })),
    };
  }, [data]);

  return { data: parsedData, ...rest };
}

export async function prefetchInboxMessages(
  queryClient: QueryClient,
  workspaceSlug: string,
  conversationId: string,
  params: InboxMessagesParams,
) {
  await queryClient.prefetchQuery({
    queryKey: [
      "inbox",
      "messages",
      workspaceSlug,
      conversationId,
      params.page,
      params.pageSize,
    ],
    queryFn: async () => {
      const response = await apiClient.workspaces[
        ":workspaceSlug"
      ].inbox.conversations[":conversationId"].messages.$get({
        param: { workspaceSlug, conversationId },
        query: {
          page: params.page.toString(),
          pageSize: params.pageSize.toString(),
        },
      });
      return response.json();
    },
  });
}
