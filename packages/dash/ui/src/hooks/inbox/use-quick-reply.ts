import type { InboxConversationSummary, InboxMessage } from "@shared/inbox";
import { useQueryClient } from "@tanstack/react-query";
import type { InboxMessagesList } from "@worker/routes/api/workspaces/inbox";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type SendMessageVariables,
  useSendInboxMessageMutation,
} from "@/queries/inbox/send-message";
import { useInboxStore } from "@/stores/inbox-store";

type MessagesQueryKey = ["inbox", "messages", string, string, number, number];

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
export function useQuickReply(
  workspaceSlug: string | undefined,
  conversation: InboxConversationSummary | null,
) {
  const queryClient = useQueryClient();
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
    workspaceSlug,
    conversationId ?? undefined,
    {
      onMutate: async (variables) => {
        if (!workspaceSlug || !conversationId || !conversation) {
          return undefined;
        }

        const baseQueryKey = [
          "inbox",
          "messages",
          workspaceSlug,
          conversationId,
        ] as const;

        await queryClient.cancelQueries({
          queryKey: baseQueryKey,
          exact: false,
        });

        const messagesKey: MessagesQueryKey = [
          "inbox",
          "messages",
          workspaceSlug,
          conversationId,
          DEFAULT_PAGE,
          DEFAULT_PAGE_SIZE,
        ];
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
          workspaceSlug,
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
      if (!message.trim() || !conversationId || !workspaceSlug) {
        return;
      }

      setIsSubmitting(true);

      const payload: SendMessageVariables = {
        text: message.trim(),
      };
      mutation.mutate(payload);
    },
    [conversationId, workspaceSlug, mutation],
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
