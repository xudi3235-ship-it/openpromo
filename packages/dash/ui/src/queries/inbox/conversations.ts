import type { AllPlatforms } from "@shared";
import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { InboxConversationsList } from "@worker/inbox/types";
import type { InboxRouterOutputs } from "@worker/orpc/routes/inbox";
import { useMemo } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { orpc } from "@/lib/orpc-client";

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

type ListConversationsOutput = InboxRouterOutputs["listConversations"];

const getListOptions = (
  workspaceSlug: string,
  params: InboxConversationsParams,
) =>
  orpc.inbox.listConversations.queryOptions({
    input: {
      workspaceSlug,
      ...params,
    },
  });

const getListInfiniteOptions = (
  workspaceSlug: string,
  filters: InboxConversationsFilters,
  pageSize: number,
) =>
  orpc.inbox.listConversations.infiniteOptions({
    input: (pageParam) => ({
      workspaceSlug,
      page: pageParam,
      pageSize,
      ...filters,
    }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const currentPage = lastPage.page;
      const totalPages = Math.ceil(lastPage.total / lastPage.pageSize);
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
  });

const getUnreadCountOptions = (workspaceSlug: string) =>
  orpc.inbox.getUnreadCount.queryOptions({
    input: { workspaceSlug },
  });

export function useInboxConversationsQuery(params: InboxConversationsParams) {
  const { workspace } = useWorkspace();
  return useQuery({
    ...getListOptions(workspace.slug, params),
    enabled: Boolean(workspace.slug),
  });
}

export async function prefetchInboxConversations(
  queryClient: QueryClient,
  workspaceSlug: string,
  params: InboxConversationsParams = { page: 1, pageSize: 25 },
) {
  await queryClient.prefetchQuery(getListOptions(workspaceSlug, params));
}

export function useInboxConversationsInfiniteQuery(
  filters: InboxConversationsFilters,
  pageSize = 25,
) {
  const { workspace } = useWorkspace();
  const query = useInfiniteQuery({
    ...getListInfiniteOptions(workspace.slug, filters, pageSize),
    enabled: Boolean(workspace.slug),
  });

  const conversations = useMemo(() => {
    if (!query.data) return [];
    return query.data.pages.flatMap((page) => page.items);
  }, [query.data]);

  const totalCount = query.data?.pages[0]?.total ?? 0;

  return {
    ...query,
    conversations,
    totalCount,
  };
}

function updateConversationCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  workspaceSlug: string,
  conversationId: string,
  updater: (
    conversation: ListConversationsOutput["items"][number],
  ) => ListConversationsOutput["items"][number],
) {
  const conversationsKey = orpc.inbox.listConversations.key({
    input: { workspaceSlug },
  });

  queryClient.setQueriesData<InfiniteData<InboxConversationsList>>(
    {
      queryKey: conversationsKey,
    },
    (oldData) => {
      if (!oldData?.pages || !Array.isArray(oldData.pages)) {
        return oldData;
      }

      return {
        ...oldData,
        pages: oldData.pages.map((page) => {
          if (!page?.items || !Array.isArray(page.items)) {
            return page;
          }

          return {
            ...page,
            items: page.items.map((item) =>
              item.id === conversationId ? updater(item) : item,
            ),
          } satisfies InboxConversationsList;
        }),
      };
    },
  );
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!workspace.slug) throw new Error("Missing workspace slug");
      return orpc.inbox.markConversationRead.call({
        workspaceSlug: workspace.slug,
        conversationId,
      });
    },
    retry: false,
    onError: () => {
      // Silent failure - UI remains unchanged
    },
    onSuccess: (data, conversationId) => {
      updateConversationCaches(
        queryClient,
        workspace.slug,
        conversationId,
        (item) => ({
          ...item,
          isUnread: data.isUnread ?? item.isUnread,
          lastReadAt: data.lastReadAt ?? item.lastReadAt ?? null,
        }),
      );
    },
  });
}

export function useMarkConversationUnread() {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!workspace.slug) throw new Error("Missing workspace slug");
      return orpc.inbox.markConversationUnread.call({
        workspaceSlug: workspace.slug,
        conversationId,
      });
    },
    onSuccess: (data, conversationId) => {
      updateConversationCaches(
        queryClient,
        workspace.slug,
        conversationId,
        (item) => ({
          ...item,
          isUnread: data.isUnread ?? item.isUnread,
          lastReadAt: data.lastReadAt ?? item.lastReadAt ?? null,
        }),
      );
    },
  });
}

export function useInboxUnreadCount() {
  const { workspace } = useWorkspace();
  return useQuery({
    ...getUnreadCountOptions(workspace.slug),
    enabled: Boolean(workspace.slug),
  });
}

export async function prefetchInboxUnreadCount(
  queryClient: QueryClient,
  workspaceSlug: string,
) {
  await queryClient.prefetchQuery(getUnreadCountOptions(workspaceSlug));
}
