import {
  InboxRealtimeEventSchema,
  InboxRealtimeEventTypes,
} from "@shared/inbox";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { Inbox } from "@/components/inbox";
import {
  type GenericEvent,
  useWorkspaceNotifications,
} from "@/hooks/useWorkspaceNotifications";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/inbox",
)({
  component: InboxRoute,
});

function InboxRoute() {
  const { workspaceSlug } = Route.useParams();
  const queryClient = useQueryClient();
  const onEvent = useCallback(
    (event: GenericEvent) => {
      const inboxRealtimeEvent = InboxRealtimeEventSchema.parse(event);
      if (
        inboxRealtimeEvent.type === InboxRealtimeEventTypes.ConversationUpserted
      ) {
        queryClient.invalidateQueries({
          predicate: (q) => {
            const key = q.queryKey as unknown[];
            return (
              Array.isArray(key) &&
              key[0] === "inbox" &&
              key[1] === "conversations" &&
              key[2] === workspaceSlug
            );
          },
        });
      } else if (
        inboxRealtimeEvent.type === InboxRealtimeEventTypes.MessageUpserted
      ) {
        queryClient.invalidateQueries({
          predicate: (q) => {
            const key = q.queryKey as unknown[];
            return (
              Array.isArray(key) &&
              key[0] === "inbox" &&
              key[1] === "messages" &&
              key[2] === workspaceSlug &&
              key[3] === inboxRealtimeEvent.conversationId
            );
          },
        });
      }
    },
    [workspaceSlug, queryClient],
  );

  useWorkspaceNotifications(workspaceSlug, {
    autoToast: false,
    onEvent,
  });

  return <Inbox />;
}
