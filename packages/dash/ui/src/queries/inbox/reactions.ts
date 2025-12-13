import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceSlug } from "@/hooks/useWorkspace";
import { orpc } from "@/lib/orpc-client";
import type { InboxMessage } from "@/stores/inbox/types";
import { useInboxStore } from "@/stores/inbox-store";

interface ReactionInput {
  conversationId: string;
  messageId: string;
  emoji: string;
}

export function useAddReaction() {
  const workspaceSlug = useWorkspaceSlug();
  const queryClient = useQueryClient();
  const updateMessage = useInboxStore((state) => state.updateMessage);
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: ReactionInput) => {
      return orpc.inbox.addReaction.call({
        workspaceSlug,
        conversationId: input.conversationId,
        messageId: input.messageId,
        emoji: input.emoji,
      });
    },
    onMutate: async (input) => {
      // Optimistic update
      const { conversationId, messageId, emoji } = input;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["inbox", "messages", conversationId],
      });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData<InboxMessage[]>([
        "inbox",
        "messages",
        conversationId,
      ]);

      // Optimistically update the message
      if (previousMessages) {
        const updatedMessages = previousMessages.map((msg) => {
          if (msg.id === messageId) {
            const metadata = msg.metadata ?? {};
            const byPlatform = metadata.byPlatform ?? {};

            // Add reaction to metadata (simplified optimistic update)
            // The actual structure will be normalized by the server
            const updatedMetadata = {
              ...metadata,
              byPlatform: {
                ...byPlatform,
                _optimistic: {
                  [msg.channel]: {
                    reactions: [
                      ...(byPlatform._optimistic?.[msg.channel]?.reactions ??
                        []),
                      {
                        key: emoji,
                        actorId: "current-user", // Will be replaced by server
                        action: "added",
                      },
                    ],
                  },
                },
              },
            };

            return { ...msg, metadata: updatedMetadata };
          }
          return msg;
        });

        queryClient.setQueryData(
          ["inbox", "messages", conversationId],
          updatedMessages,
        );
      }

      // Also update store with optimistic reaction
      const message = queryClient
        .getQueryData<InboxMessage[]>(["inbox", "messages", conversationId])
        ?.find((m) => m.id === messageId);

      if (message && user?.id) {
        const metadata = message.metadata ?? {};
        const byPlatform = metadata.byPlatform ?? {};

        updateMessage({
          conversationId,
          messageId,
          patch: {
            metadata: {
              ...metadata,
              byPlatform: {
                ...byPlatform,
                _optimistic: {
                  dm: {
                    reactions: [
                      ...(byPlatform._optimistic?.dm?.reactions ?? []),
                      {
                        key: emoji,
                        actorId: user.id,
                        action: "added",
                      },
                    ],
                  },
                },
              },
            },
          },
        });
      }

      return { previousMessages };
    },
    onError: (_err, input, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["inbox", "messages", input.conversationId],
          context.previousMessages,
        );
      }
    },
    onSettled: (_data, _error, input) => {
      // Refetch to get the actual server state
      queryClient.invalidateQueries({
        queryKey: ["inbox", "messages", input.conversationId],
      });
    },
  });
}

export function useRemoveReaction() {
  const workspaceSlug = useWorkspaceSlug();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ReactionInput) => {
      return orpc.inbox.removeReaction.call({
        workspaceSlug,
        conversationId: input.conversationId,
        messageId: input.messageId,
        emoji: input.emoji,
      });
    },
    onMutate: async (input) => {
      // Optimistic update
      const { conversationId, messageId, emoji } = input;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["inbox", "messages", conversationId],
      });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData<InboxMessage[]>([
        "inbox",
        "messages",
        conversationId,
      ]);

      // Optimistically remove the reaction
      if (previousMessages) {
        const updatedMessages = previousMessages.map((msg) => {
          if (msg.id === messageId) {
            const metadata = msg.metadata ?? {};
            const byPlatform = metadata.byPlatform ?? {};

            // Remove reaction from all platforms
            const updatedByPlatform = Object.entries(byPlatform).reduce(
              (acc, [platform, platformMeta]) => {
                if (platformMeta && typeof platformMeta === "object") {
                  const updatedPlatformMeta = Object.entries(
                    platformMeta,
                  ).reduce(
                    (channelAcc, [channel, channelMeta]) => {
                      if (channelMeta && typeof channelMeta === "object") {
                        const reactions = (
                          channelMeta as { reactions?: unknown[] }
                        ).reactions;
                        if (Array.isArray(reactions)) {
                          const filteredReactions = reactions.filter(
                            (r: { key?: string; actorId?: string }) =>
                              !(
                                r.key === emoji && r.actorId === "current-user"
                              ),
                          );
                          return {
                            // biome-ignore lint/performance/noAccumulatingSpread: Object merging is necessary for nested structure
                            ...channelAcc,
                            [channel]: {
                              ...channelMeta,
                              reactions: filteredReactions,
                            },
                          };
                        }
                      }
                      // biome-ignore lint/performance/noAccumulatingSpread: Object merging is necessary for nested structure
                      return { ...channelAcc, [channel]: channelMeta };
                    },
                    {} as Record<string, unknown>,
                  );
                  // biome-ignore lint/performance/noAccumulatingSpread: Object merging is necessary for nested structure
                  return { ...acc, [platform]: updatedPlatformMeta };
                }
                // biome-ignore lint/performance/noAccumulatingSpread: Object merging is necessary for nested structure
                return { ...acc, [platform]: platformMeta };
              },
              {} as Record<string, unknown>,
            );

            return {
              ...msg,
              metadata: { ...metadata, byPlatform: updatedByPlatform },
            };
          }
          return msg;
        });

        queryClient.setQueryData(
          ["inbox", "messages", conversationId],
          updatedMessages,
        );
      }

      return { previousMessages };
    },
    onError: (_err, input, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["inbox", "messages", input.conversationId],
          context.previousMessages,
        );
      }
    },
    onSettled: (_data, _error, input) => {
      // Refetch to get the actual server state
      queryClient.invalidateQueries({
        queryKey: ["inbox", "messages", input.conversationId],
      });
    },
  });
}
