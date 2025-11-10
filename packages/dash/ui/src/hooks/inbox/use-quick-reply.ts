import type { InboxConversationSummary, InboxMessage } from "@shared/inbox";
import { useQueryClient } from "@tanstack/react-query";
import type { InboxMessagesList } from "@worker/inbox/types";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { orpc } from "@/lib/orpc-client";
import {
  type SendMessageVariables,
  useSendInboxMessageMutation,
} from "@/queries/inbox/send-message";
import { useInboxStore } from "@/stores/inbox-store";
import { useWorkspace } from "../useWorkspace";

type MessagesQueryKey = ReturnType<typeof orpc.inbox.listMessages.queryKey>;

type QuickReplyMutationContext = {
  previousMessages?: InboxMessagesList;
  optimisticId: string;
  conversationId: string;
  workspaceSlug: string;
  messagesKey: MessagesQueryKey;
  text: string;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;

function createOptimisticMessage(
  id: string,
  text: string,
  conversation: InboxConversationSummary,
): InboxMessage {
  const createdAt = new Date();
  return {
    id,
    externalId: id,
    sender: "self",
    channel: conversation.channel,
    text,
    attachments: [],
    createdAt,
    contentId: null,
    metadata: {
      optimistic: true,
      pendingEcho: true,
      extra: {
        generatedAt: createdAt.toISOString(),
      },
    },
  };
}

/**
 * Hook for quick reply functionality in inbox conversations
 * Handles optimistic updates and message sending without opening the full conversation
 */
export function useQuickReply(conversation: InboxConversationSummary | null) {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const appendMessages = useInboxStore((state) => state.appendMessages);
  const removeMessage = useInboxStore((state) => state.removeMessage);
  const initializeThread = useInboxStore((state) => state.initializeThread);
  const setActiveQuickReply = useInboxStore(
    (state) => state.setActiveQuickReply,
  );

  const conversationId = conversation?.id ?? null;

  const optimisticIdGenerator = useMemo(() => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return () => `optimistic-${crypto.randomUUID()}`;
    }
    return () =>
      `optimistic-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
  }, []);

  const mutation = useSendInboxMessageMutation<QuickReplyMutationContext>(
    conversationId ?? undefined,
    {
      onMutate: async (variables) => {
        if (!workspace.slug || !conversationId || !conversation) {
          return undefined;
        }

        const baseQueryKey = orpc.inbox.listMessages.key({
          input: {
            workspaceSlug: workspace.slug,
            conversationId,
          },
        });

        await queryClient.cancelQueries({
          queryKey: baseQueryKey,
        });

        const messagesKey: MessagesQueryKey = orpc.inbox.listMessages.queryKey({
          input: {
            workspaceSlug: workspace.slug,
            conversationId,
            page: DEFAULT_PAGE,
            pageSize: DEFAULT_PAGE_SIZE,
          },
        });
        const previousMessages =
          queryClient.getQueryData<InboxMessagesList>(messagesKey);

        initializeThread(conversationId);

        const optimisticId = optimisticIdGenerator();
        const optimisticMessage = createOptimisticMessage(
          optimisticId,
          variables.text ?? "",
          conversation,
        );

        appendMessages({
          conversationId,
          items: [optimisticMessage],
        });

        queryClient.setQueryData<InboxMessagesList>(messagesKey, (current) => {
          if (!current) {
            return {
              items: [optimisticMessage],
              page: DEFAULT_PAGE,
              pageSize: DEFAULT_PAGE_SIZE,
              total: 1,
            } satisfies InboxMessagesList;
          }
          return {
            ...current,
            items: [...current.items, optimisticMessage],
            total: current.total + 1,
          } satisfies InboxMessagesList;
        });

        return {
          previousMessages,
          optimisticId,
          conversationId,
          workspaceSlug: workspace.slug,
          messagesKey,
          text: variables.text ?? "",
        } satisfies QuickReplyMutationContext;
      },
      onError: (error, _variables, context) => {
        if (!context) return;

        queryClient.setQueryData<InboxMessagesList | undefined>(
          context.messagesKey,
          () => context.previousMessages,
        );
        removeMessage({
          conversationId: context.conversationId,
          messageId: context.optimisticId,
        });

        toast.error("Failed to send message", {
          description: error.message || "Please try again",
        });
      },
      onSuccess: (_data, _variables, context) => {
        if (!context) return;

        // Remove the optimistic message - the real one will come via websocket
        removeMessage({
          conversationId: context.conversationId,
          messageId: context.optimisticId,
        });

        // Close quick reply input on success
        setActiveQuickReply(null);
        setText("");

        toast.success("Message sent");
      },
      onSettled: () => {
        setIsSubmitting(false);
      },
    },
  );

  const sendQuickReply = useCallback(
    async (message: string) => {
      if (!message.trim() || !conversationId || !workspace.slug) {
        return;
      }

      setIsSubmitting(true);

      const payload: SendMessageVariables = {
        text: message.trim(),
      };
      mutation.mutate(payload);
    },
    [conversationId, mutation, workspace.slug],
  );

  const cancel = useCallback(() => {
    setText("");
    setActiveQuickReply(null);
  }, [setActiveQuickReply]);

  return {
    text,
    setText,
    sendQuickReply,
    cancel,
    isSubmitting,
    isPending: mutation.isPending,
  };
}
