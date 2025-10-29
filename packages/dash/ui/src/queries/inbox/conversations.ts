import type { AllPlatforms } from "@shared";
import { InboxConversationSummarySchema } from "@shared/inbox";
import type { QueryClient } from "@tanstack/react-query";
import type { InboxConversationsList } from "@worker/routes/api/workspaces/inbox";
import { useMemo } from "react";
import {
  apiClient,
  type UseHonoQueryOptions,
  useHonoQuery,
} from "@/lib/hono-client";

export type InboxConversationsParams = {
  page: number;
  pageSize: number;
  q?: string;
  platform?: AllPlatforms;
  channel?: "dm" | "post_comment";
  connectedAccountId?: string;
};

type InboxConversationsQueryOptions = {
  onError?: (error: unknown) => void;
};

function getConversationsQueryOpts(
  workspaceSlug: string | undefined,
  params: InboxConversationsParams,
  options: InboxConversationsQueryOptions,
): UseHonoQueryOptions<InboxConversationsList> {
  return {
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
    onError: options.onError,
  } as unknown as UseHonoQueryOptions<InboxConversationsList>;
}

export function useInboxConversationsQuery(
  workspaceSlug: string | undefined,
  params: InboxConversationsParams,
  options: InboxConversationsQueryOptions = {},
) {
  const { data, ...rest } = useHonoQuery<InboxConversationsList>(
    getConversationsQueryOpts(workspaceSlug, params, options),
  );
  // FIXME: this is kinda a bigger problem, hono does not use superjson
  // and as a result it just deserializes dates as strings, making it hard for us
  // to reuse the zod types in client side.
  // this is not gonna scale, we have so many endpoints that have this problems
  const parsedData = useMemo(() => {
    if (!data) return undefined;
    return {
      ...data,
      items: data.items.map((item) =>
        InboxConversationSummarySchema.parse({
          ...item,
          lastMessageAt: new Date(item.lastMessageAt),
        }),
      ),
    } satisfies InboxConversationsList;
  }, [data]);

  return { data: parsedData, ...rest };
}

export async function prefetchInboxConversations(
  queryClient: QueryClient,
  workspaceSlug: string,
  params: InboxConversationsParams = { page: 1, pageSize: 25 },
) {
  const queryOpts = getConversationsQueryOpts(workspaceSlug, params, {});
  // prefetch, no await
  queryClient.prefetchQuery({
    ...queryOpts,
    queryFn: async () => {
      const response = await apiClient.workspaces[
        ":workspaceSlug"
      ].inbox.conversations.$get({
        param: { workspaceSlug },
        query: {
          ...params,
          page: params.page.toString(),
          pageSize: params.pageSize.toString(),
        },
      });
      const payload = await response.json();
      return {
        ...payload,
        items: payload.items.map((item) =>
          InboxConversationSummarySchema.parse({
            ...item,
            lastMessageAt: new Date(item.lastMessageAt),
          }),
        ),
      } satisfies InboxConversationsList;
    },
  });
}
