import type { AllPlatforms } from "@shared";
import { InboxConversationSummarySchema } from "@shared/inbox";
import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { InboxConversationsList } from "@worker/routes/api/workspaces/inbox";
import { useMemo } from "react";
import {
  apiClient,
  honoApiCall,
  type UseHonoQueryOptions,
  useHonoMutation,
  useHonoQuery,
} from "@/lib/hono-client";

export type InboxConversationsParams = {
  page: number;
  pageSize: number;
  q?: string;
  platform?: AllPlatforms;
  channel?: "dm" | "post_comment";
  connectedAccountId?: string;
  unread?: boolean;
};

export type InboxConversationsFilters = Omit<
  InboxConversationsParams,
  "page" | "pageSize"
>;

type InboxConversationsQueryOptions = {
  onError?: (error: unknown) => void;
};

function getConversationsQueryOpts(
  workspaceSlug: string | undefined,
  params: InboxConversationsParams,
  options: InboxConversationsQueryOptions,
): UseHonoQueryOptions<InboxConversationsList> {
  const { unread, ...restParams } = params;
  return {
    enabled: Boolean(workspaceSlug),
    queryKey: ["inbox", "conversations", workspaceSlug, params],
    queryFn: (api: typeof apiClient) =>
      api.workspaces[":workspaceSlug"].inbox.conversations.$get({
        param: { workspaceSlug: String(workspaceSlug) },
        query: {
          ...restParams,
          page: params.page.toString(),
          pageSize: params.pageSize.toString(),
          ...(unread !== undefined && { unread: unread.toString() }),
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
  const { unread, ...restParams } = params;
  // prefetch, no await
  queryClient.prefetchQuery({
    ...queryOpts,
    queryFn: async () => {
      const response = await apiClient.workspaces[
        ":workspaceSlug"
      ].inbox.conversations.$get({
        param: { workspaceSlug },
        query: {
          ...restParams,
          page: params.page.toString(),
          pageSize: params.pageSize.toString(),
          ...(unread !== undefined && { unread: unread.toString() }),
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

export function useInboxConversationsInfiniteQuery(
  workspaceSlug: string | undefined,
  filters: InboxConversationsFilters,
  pageSize = 25,
) {
  const { unread, ...restFilters } = filters;
  const query = useInfiniteQuery({
    queryKey: ["inbox", "conversations", workspaceSlug, filters, pageSize],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await honoApiCall(
        (api) =>
          api.workspaces[":workspaceSlug"].inbox.conversations.$get({
            param: { workspaceSlug: String(workspaceSlug) },
            query: {
              ...restFilters,
              page: pageParam.toString(),
              pageSize: pageSize.toString(),
              ...(unread !== undefined && { unread: unread.toString() }),
            },
          }),
        { disableErrorToast: false },
      );

      if (!res.success) {
        throw new Error(res.error.message);
      }

      // Parse dates
      return {
        ...res.data,
        items: res.data.items.map((item) =>
          InboxConversationSummarySchema.parse({
            ...item,
            lastMessageAt: new Date(item.lastMessageAt),
          }),
        ),
      } satisfies InboxConversationsList;
    },
    getNextPageParam: (lastPage) => {
      const currentPage = lastPage.page;
      const totalPages = Math.ceil(lastPage.total / lastPage.pageSize);
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: Boolean(workspaceSlug),
  });

  const allConversations = useMemo(() => {
    if (!query.data) return [];
    return query.data.pages.flatMap((page) => page.items);
  }, [query.data]);

  return {
    ...query,
    conversations: allConversations,
    totalCount: query.data?.pages[0]?.total ?? 0,
  };
}

export function useMarkConversationRead(workspaceSlug: string | undefined) {
  const queryClient = useQueryClient();

  return useHonoMutation({
    mutationFn: (api, conversationId: string) =>
      api.workspaces[":workspaceSlug"].inbox.conversations[":id"][
        "mark-read"
      ].$post({
        param: {
          workspaceSlug: String(workspaceSlug),
          id: conversationId,
        },
      }),
    onSuccess: (data, conversationId) => {
      // Type-safe update for infinite queries
      queryClient.setQueriesData<InfiniteData<InboxConversationsList>>(
        {
          queryKey: ["inbox", "conversations", workspaceSlug],
          exact: false,
        },
        (oldData) => {
          // Guard: ensure oldData exists and has the expected structure
          if (!oldData?.pages || !Array.isArray(oldData.pages)) {
            return oldData;
          }

          return {
            ...oldData,
            pages: oldData.pages.map((page) => {
              // Guard: ensure page exists and has items array
              if (!page?.items || !Array.isArray(page.items)) {
                return page;
              }

              return {
                ...page,
                items: page.items.map((item) => {
                  // Guard: ensure item exists and has id
                  if (!item?.id || item.id !== conversationId) {
                    return item;
                  }

                  // Safely update the matched conversation
                  return {
                    ...item,
                    isUnread: data.isUnread ?? item.isUnread,
                    lastReadAt: data.lastReadAt
                      ? new Date(data.lastReadAt)
                      : null,
                  };
                }),
              };
            }),
          };
        },
      );
    },
  });
}

export function useMarkConversationUnread(workspaceSlug: string | undefined) {
  const queryClient = useQueryClient();

  return useHonoMutation({
    mutationFn: (api, conversationId: string) =>
      api.workspaces[":workspaceSlug"].inbox.conversations[":id"][
        "mark-unread"
      ].$post({
        param: {
          workspaceSlug: String(workspaceSlug),
          id: conversationId,
        },
      }),
    onSuccess: (data, conversationId) => {
      // Type-safe update for infinite queries
      queryClient.setQueriesData<InfiniteData<InboxConversationsList>>(
        {
          queryKey: ["inbox", "conversations", workspaceSlug],
          exact: false,
        },
        (oldData) => {
          // Guard: ensure oldData exists and has the expected structure
          if (!oldData?.pages || !Array.isArray(oldData.pages)) {
            return oldData;
          }

          return {
            ...oldData,
            pages: oldData.pages.map((page) => {
              // Guard: ensure page exists and has items array
              if (!page?.items || !Array.isArray(page.items)) {
                return page;
              }

              return {
                ...page,
                items: page.items.map((item) => {
                  // Guard: ensure item exists and has id
                  if (!item?.id || item.id !== conversationId) {
                    return item;
                  }

                  // Safely update the matched conversation
                  return {
                    ...item,
                    isUnread: data.isUnread ?? item.isUnread,
                    lastReadAt: data.lastReadAt
                      ? new Date(data.lastReadAt)
                      : null,
                  };
                }),
              };
            }),
          };
        },
      );
    },
  });
}

// ===== Unread Count Queries =====

export function useInboxUnreadCount(workspaceSlug: string | undefined) {
  return useHonoQuery<{ unreadCount: number }>({
    enabled: Boolean(workspaceSlug),
    queryKey: ["inbox", "unread-count", workspaceSlug],
    queryFn: (api: typeof apiClient) =>
      api.workspaces[":workspaceSlug"].inbox["unread-count"].$get({
        param: { workspaceSlug: String(workspaceSlug) },
      }),
  });
}

export async function prefetchInboxUnreadCount(
  queryClient: QueryClient,
  workspaceSlug: string,
) {
  // Prefetch without await - non-blocking
  queryClient.prefetchQuery({
    queryKey: ["inbox", "unread-count", workspaceSlug],
    queryFn: async () => {
      const response = await apiClient.workspaces[":workspaceSlug"].inbox[
        "unread-count"
      ].$get({
        param: { workspaceSlug },
      });
      const data = await response.json();
      return data as { unreadCount: number };
    },
  });
}
