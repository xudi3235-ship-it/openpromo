import type { QueryClient } from "@tanstack/react-query";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/useWorkspace";
import { orpc } from "@/lib/orpc-client";

type InboxMessagesParams = {
  page: number;
  pageSize: number;
};

const getMessagesOptions = (
  workspaceSlug: string,
  conversationId: string,
  params: InboxMessagesParams,
) =>
  orpc.inbox.listMessages.queryOptions({
    input: {
      workspaceSlug,
      conversationId,
      ...params,
    },
  });

const getMessagesInfiniteOptions = (
  workspaceSlug: string,
  conversationId: string,
  pageSize: number,
) =>
  orpc.inbox.listMessages.infiniteOptions({
    input: (pageParam) => ({
      workspaceSlug,
      conversationId,
      page: pageParam,
      pageSize,
    }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const currentPage = lastPage.page;
      const totalPages = Math.ceil(lastPage.total / lastPage.pageSize);
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
  });

export function useInboxMessagesQuery(
  conversationId: string | undefined,
  params: InboxMessagesParams,
) {
  const { workspace } = useWorkspace();
  return useQuery({
    ...getMessagesOptions(
      workspace.slug,
      // biome-ignore lint/style/noNonNullAssertion: enabled guards
      conversationId!,
      params,
    ),
    enabled: Boolean(conversationId),
  });
}

export function useInboxMessagesInfiniteQuery(
  conversationId: string | undefined,
  pageSize = 50,
) {
  const { workspace } = useWorkspace();
  return useInfiniteQuery({
    ...getMessagesInfiniteOptions(
      workspace.slug,
      // biome-ignore lint/style/noNonNullAssertion: enabled guards
      conversationId!,
      pageSize,
    ),
    enabled: Boolean(conversationId),
  });
}

export async function prefetchInboxMessages(
  queryClient: QueryClient,
  workspaceSlug: string,
  conversationId: string,
  params: InboxMessagesParams,
) {
  await queryClient.prefetchQuery(
    getMessagesOptions(workspaceSlug, conversationId, params),
  );
}
