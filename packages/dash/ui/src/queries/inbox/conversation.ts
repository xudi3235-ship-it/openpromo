import type { InboxConversationSummary } from "@shared/inbox";
import { InboxConversationSummarySchema } from "@shared/inbox";
import { useMemo } from "react";
import type { UseHonoQueryOptions } from "@/lib/hono-client";
import { type apiClient, useHonoQuery } from "@/lib/hono-client";

export function useInboxConversationQuery(
  workspaceSlug: string | undefined,
  conversationId: string | undefined,
) {
  const { data, ...rest } = useHonoQuery<InboxConversationSummary>({
    enabled: Boolean(workspaceSlug) && Boolean(conversationId),
    queryKey: ["inbox", "conversation", workspaceSlug, conversationId],
    queryFn: (api: typeof apiClient) =>
      api.workspaces[":workspaceSlug"].inbox.conversations[
        ":conversationId"
      ].$get({
        param: {
          workspaceSlug: String(workspaceSlug),
          conversationId: String(conversationId),
        },
      }),
  } as unknown as UseHonoQueryOptions<InboxConversationSummary>);

  // Parse data with Zod to convert date strings back to Date objects
  const parsedData = useMemo(() => {
    if (!data) return undefined;
    return InboxConversationSummarySchema.parse({
      ...data,
      lastMessageAt: new Date(data.lastMessageAt),
    });
  }, [data]);

  return { data: parsedData, ...rest };
}
