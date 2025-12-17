import type {
  InboxAttachment,
  InboxConversationSummary,
  InboxMessage,
} from "@shared/inbox";
import { useQueryClient } from "@tanstack/react-query";
import type { InboxMessagesList } from "@worker/inbox/types";
import { Image as ImageIcon, Loader2, Smile, X } from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAttachmentComposer } from "@/hooks/inbox/useAttachmentComposer";
import { useWorkspace } from "@/hooks/useWorkspace";
import { orpc } from "@/lib/orpc-client";
import {
  type SendMessageVariables,
  useSendInboxMessageMutation,
} from "@/queries/inbox/send-message";
import { useInboxStore } from "@/stores/inbox-store";
import { MessageComposer, type MessageComposerStatus } from "./v2/composer";

type SendMessageMutationContext =
  | {
      previousMessages?: InboxMessagesList;
      optimisticId: string;
      conversationId: string;
      workspaceSlug: string;
      messagesKey: ReturnType<typeof orpc.inbox.listMessages.queryKey>;
      text: string;
      replyToMessageId: string | null;
      attachments: InboxAttachment[];
    }
  | undefined;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;

function createOptimisticMessage(
  id: string,
  text: string,
  attachments: InboxAttachment[],
  conversation: InboxConversationSummary,
  replyToMessageId: string | null,
): InboxMessage {
  const createdAt = new Date();
  const normalizedText = text.trim().length > 0 ? text : null;
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
    text: normalizedText,
    attachments,
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
  conversation,
}: {
  conversation: InboxConversationSummary | null;
}) {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();
  const [draft, setDraft] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const {
    attachments: composerAttachments,
    hasAttachments: composerHasAttachments,
    isUploading: isUploadingAttachment,
    fileInputRef,
    handleFileChange,
    handleAttachmentButtonClick,
    removeAttachment,
    clearAttachments,
    restoreAttachments,
  } = useAttachmentComposer(conversation);
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
    conversationId ?? undefined,
    {
      onMutate: async (variables) => {
        if (!workspace.slug || !conversationId || !conversation) {
          return undefined;
        }
        setErrorMessage(null);
        const listMsgKey = orpc.inbox.listMessages.queryKey({
          input: {
            workspaceSlug: workspace.slug,
            conversationId,
          },
        });
        await queryClient.cancelQueries({ queryKey: listMsgKey });

        const previousMessages =
          queryClient.getQueryData<InboxMessagesList>(listMsgKey);

        initializeThread(conversationId);

        const optimisticId = optimisticIdPrefix();
        const textValue = variables.text ?? "";
        const attachmentsValue = variables.attachments ?? [];
        const optimisticMessage = createOptimisticMessage(
          optimisticId,
          textValue,
          attachmentsValue,
          conversation,
          variables.replyToMessageId ?? null,
        );

        appendMessages({
          conversationId,
          items: [optimisticMessage],
        });

        queryClient.setQueryData<InboxMessagesList>(listMsgKey, (current) => {
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
          messagesKey: listMsgKey,
          text: textValue,
          replyToMessageId: variables.replyToMessageId ?? null,
          attachments: attachmentsValue,
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
        if (context.attachments.length > 0) {
          restoreAttachments(context.attachments);
        }
        setErrorMessage(error.message || "Unable to send message");
      },
      onSuccess: (_data, _variables, context) => {
        if (!context) return;
        // Don't remove optimistic message immediately - wait for WebSocket event
        // The optimistic message will be replaced by the real message when it arrives
        // via WebSocket event, which will match by text content and timestamp
        // If WebSocket doesn't arrive within reasonable time, it will be cleaned up
        // by the mergeMessages logic when matching by text + timestamp
      },
    },
  );

  const isReady = Boolean(conversation?.id);
  const trimmedDraft = draft.trim();
  const hasText = trimmedDraft.length > 0;
  const hasAttachments = composerHasAttachments;
  const isSendDisabled =
    !isReady ||
    (!hasText && !hasAttachments) ||
    mutation.isPending ||
    isUploadingAttachment;
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
      const hasMessageText = value.length > 0;
      if (!hasMessageText && !hasAttachments) return;

      const targetMessageId = replyTargetId ?? null;
      const attachmentsPayload = composerAttachments.map(
        (attachment) => attachment.data,
      );
      const payload: SendMessageVariables = {};
      if (hasMessageText) {
        payload.text = value;
      }
      if (attachmentsPayload.length > 0) {
        payload.attachments = attachmentsPayload;
      }
      if (targetMessageId) {
        payload.replyToMessageId = targetMessageId;
      }
      mutation.mutate(payload);
      setDraft("");
      clearAttachments();
      if (conversationId) {
        clearComposerDraft(conversationId);
        clearComposerReplyTarget(conversationId);
      }
      setErrorMessage(null);
    },
    [
      clearComposerDraft,
      clearComposerReplyTarget,
      clearAttachments,
      conversation,
      conversationId,
      isSendDisabled,
      mutation,
      composerAttachments,
      hasAttachments,
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

  const handleRemoveAttachment = useCallback(() => {
    removeAttachment();
  }, [removeAttachment]);

  return (
    <footer className="bg-background px-4 py-2.5">
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
        {(composerAttachments.length > 0 || isUploadingAttachment) && (
          <div className="flex items-center gap-3 px-2.5 pb-2">
            {composerAttachments.map((attachment) => (
              <div
                key={attachment.id}
                className="group relative h-16 w-16 overflow-hidden rounded-md border border-border/60 bg-muted/20"
              >
                {attachment.data.type === "video" ? (
                  <video
                    src={attachment.data.url}
                    className="h-full w-full object-cover"
                    muted
                    autoPlay
                    loop
                  />
                ) : (
                  <img
                    src={attachment.data.url}
                    alt={attachment.name ?? "Attached image"}
                    className="h-full w-full object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={handleRemoveAttachment}
                  className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-sm transition hover:text-foreground"
                  aria-label="Remove attachment"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {isUploadingAttachment && (
              <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-border/60 bg-muted/20">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        )}
        <MessageComposer.Toolbar>
          <MessageComposer.Tools>
            <MessageComposer.Button
              type="button"
              onClick={handleAttachmentButtonClick}
              disabled={
                !conversation ||
                isUploadingAttachment ||
                mutation.isPending ||
                hasAttachments
              }
              aria-label="Attach media"
            >
              {isUploadingAttachment ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
            </MessageComposer.Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(event) => handleFileChange(event.target.files)}
            />
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
