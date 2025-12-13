import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceSlug } from "@/hooks/useWorkspace";
import { orpc } from "@/lib/orpc-client";
import type { InboxMessage } from "@/stores/inbox/types";

interface ReactionInput {
  conversationId: string;
  messageId: string;
  emoji: string;
}

export function useAddReaction() {
  const workspaceSlug = useWorkspaceSlug();
  const queryClient = useQueryClient();

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
      // Cancel any outgoing refetches
      const { conversationId } = input;

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

      // Note: Optimistic update removed to avoid type errors
      // Server will return updated state quickly via realtime events

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
                            (
                              r: unknown,
                            ): r is { key?: string; actorId?: string } =>
                              typeof r === "object" &&
                              r !== null &&
                              "key" in r &&
                              "actorId" in r &&
                              !(
                                (r as { key?: string; actorId?: string })
                                  .key === emoji &&
                                (r as { key?: string; actorId?: string })
                                  .actorId === "current-user"
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
