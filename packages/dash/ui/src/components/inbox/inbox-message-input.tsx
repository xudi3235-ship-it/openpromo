import type { InboxConversationSummary, InboxMessage } from "@shared/inbox";
import { useQueryClient } from "@tanstack/react-query";
import type { InboxMessagesList } from "@worker/routes/api/workspaces/inbox";
import { Paperclip, Smile } from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSendInboxMessageMutation } from "@/queries/inbox/send-message";
import { useInboxStore } from "@/stores/inbox-store";
import { MessageComposer, type MessageComposerStatus } from "./v2/composer";

type InboxMessageInputProps = {
  workspaceSlug: string | undefined;
  conversation: InboxConversationSummary | null;
};

type MessagesQueryKey = ["inbox", "messages", string, string, number, number];

type SendMessageMutationContext = {
  previousMessages?: InboxMessagesList;
  optimisticId: string;
  conversationId: string;
  workspaceSlug: string;
  messagesKey: MessagesQueryKey;
  text: string;
  replyToMessageId: string | null;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;

function createOptimisticMessage(
  id: string,
  text: string,
  conversation: InboxConversationSummary,
  replyToMessageId: string | null,
): InboxMessage {
  const createdAt = new Date();
  const extra: Record<string, unknown> = {
    generatedAt: createdAt.toISOString(),
  };
  if (replyToMessageId) {
    extra.replyToMessageId = replyToMessageId;
  }
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
      extra,
    },
  };
}

export function InboxMessageInput({
  workspaceSlug,
  conversation,
}: InboxMessageInputProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const appendMessages = useInboxStore((state) => state.appendMessages);
  const removeMessage = useInboxStore((state) => state.removeMessage);
  const initializeThread = useInboxStore((state) => state.initializeThread);
  const setComposerDraft = useInboxStore((state) => state.setComposerDraft);
  const clearComposerDraft = useInboxStore((state) => state.clearComposerDraft);
  const setComposerReplyTarget = useInboxStore(
    (state) => state.setComposerReplyTarget,
  );
  const clearComposerReplyTarget = useInboxStore(
    (state) => state.clearComposerReplyTarget,
  );
  const conversationId = conversation?.id ?? null;
  const storedDraft = useInboxStore((state) =>
    conversationId ? (state.composerDrafts[conversationId] ?? "") : "",
  );
  const replyTargetId = useInboxStore((state) =>
    conversationId
      ? (state.composerReplyTargets[conversationId] ?? null)
      : null,
  );
  const replyTargetMessage = useInboxStore((state) => {
    if (!conversationId || !replyTargetId) return null;
    const thread = state.threads[conversationId];
    return thread?.itemsById?.[replyTargetId] ?? null;
  });

  const optimisticIdPrefix = useMemo(() => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return () => `optimistic-${crypto.randomUUID()}`;
    }
    return () =>
      `optimistic-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
  }, []);

  useEffect(() => {
    setDraft(storedDraft ?? "");
    setErrorMessage(null);
  }, [storedDraft]);

  const mutation = useSendInboxMessageMutation<SendMessageMutationContext>(
    workspaceSlug,
    conversationId ?? undefined,
    {
      onMutate: async (variables) => {
        if (!workspaceSlug || !conversationId || !conversation) {
          return undefined;
        }

        setErrorMessage(null);

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

        const optimisticId = optimisticIdPrefix();
        const optimisticMessage = createOptimisticMessage(
          optimisticId,
          variables.text,
          conversation,
          variables.replyToMessageId ?? null,
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
          text: variables.text,
          replyToMessageId: variables.replyToMessageId ?? null,
        } satisfies SendMessageMutationContext;
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
        setDraft(context.text);
        setComposerDraft(context.conversationId, context.text);
        if (context.replyToMessageId) {
          setComposerReplyTarget(
            context.conversationId,
            context.replyToMessageId,
          );
        }
        setErrorMessage(error.message || "Unable to send message");
      },
      onSettled: (_data, _error, _variables, context) => {
        if (!context) return;
        queryClient.invalidateQueries({
          queryKey: [
            "inbox",
            "messages",
            context.workspaceSlug,
            context.conversationId,
          ],
          exact: false,
        });
      },
    },
  );

  const isReady = Boolean(workspaceSlug && conversation?.id);
  const trimmedDraft = draft.trim();
  const isSendDisabled =
    !isReady || trimmedDraft.length === 0 || mutation.isPending;
  const submitStatus: MessageComposerStatus = mutation.isPending
    ? "submitting"
    : mutation.isError
      ? "error"
      : "idle";

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isSendDisabled || !conversation) return;
      const value = trimmedDraft;
      if (!value) return;

      const targetMessageId = replyTargetId ?? null;
      const payload = targetMessageId
        ? { text: value, replyToMessageId: targetMessageId }
        : { text: value };
      mutation.mutate(payload);
      setDraft("");
      if (conversationId) {
        clearComposerDraft(conversationId);
        clearComposerReplyTarget(conversationId);
      }
    },
    [
      clearComposerDraft,
      clearComposerReplyTarget,
      conversation,
      conversationId,
      isSendDisabled,
      mutation,
      replyTargetId,
      trimmedDraft,
    ],
  );

  const handleDraftChange = useCallback(
    (value: string) => {
      setDraft(value);
      if (conversationId) {
        if (value) {
          setComposerDraft(conversationId, value);
        } else {
          clearComposerDraft(conversationId);
        }
      }
      if (errorMessage) {
        setErrorMessage(null);
      }
    },
    [clearComposerDraft, conversationId, errorMessage, setComposerDraft],
  );

  const handleCancelReply = useCallback(() => {
    if (!conversationId) return;
    clearComposerReplyTarget(conversationId);
  }, [clearComposerReplyTarget, conversationId]);

  return (
    <footer className="bg-background px-6 py-3">
      <MessageComposer.Root onSubmit={handleSubmit}>
        {replyTargetMessage ? (
          <MessageComposer.ReplyPreview
            message={replyTargetMessage}
            onCancel={handleCancelReply}
          />
        ) : null}
        <MessageComposer.Textarea
          key={conversation?.id ?? "inactive"}
          value={draft}
          onChange={(event) => handleDraftChange(event.target.value)}
          placeholder={
            conversation
              ? "Send a quick reply…"
              : "Select a conversation to start messaging"
          }
          disabled={!conversation}
        />
        <MessageComposer.Toolbar>
          <MessageComposer.Tools>
            <MessageComposer.Button type="button" disabled>
              <Paperclip className="h-4 w-4" />
            </MessageComposer.Button>
            <MessageComposer.Button type="button" disabled>
              <Smile className="h-4 w-4" />
            </MessageComposer.Button>
          </MessageComposer.Tools>
          <MessageComposer.Actions>
            {errorMessage ? (
              <span className="text-xs text-destructive">{errorMessage}</span>
            ) : (
              <span className="text-xs text-muted-foreground">
                Enter to send • Shift+Enter for newline
              </span>
            )}
            <MessageComposer.Submit
              status={submitStatus}
              disabled={isSendDisabled}
            />
          </MessageComposer.Actions>
        </MessageComposer.Toolbar>
      </MessageComposer.Root>
    </footer>
  );
}
