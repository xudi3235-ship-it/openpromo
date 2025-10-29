import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import { Textarea } from "@openpromo/ui/components/textarea";
import type { InboxConversationSummary, InboxMessage } from "@shared/inbox";
import { useQueryClient } from "@tanstack/react-query";
import type { InboxMessagesList } from "@worker/routes/api/workspaces/inbox";
import { Paperclip, Send } from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useSendInboxMessageMutation } from "@/queries/inbox/send-message";
import { useInboxStore } from "@/stores/inbox-store";

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

export function InboxMessageInput({
  workspaceSlug,
  conversation,
}: InboxMessageInputProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const appendMessages = useInboxStore((state) => state.appendMessages);
  const removeMessage = useInboxStore((state) => state.removeMessage);
  const initializeThread = useInboxStore((state) => state.initializeThread);

  const optimisticIdPrefix = useMemo(() => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return () => `optimistic-${crypto.randomUUID()}`;
    }
    return () =>
      `optimistic-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
  }, []);

  const mutation = useSendInboxMessageMutation<SendMessageMutationContext>(
    workspaceSlug,
    conversation?.id,
    {
      onMutate: async (variables) => {
        if (!workspaceSlug || !conversation) return undefined;

        const conversationId = conversation.id;
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
        } satisfies SendMessageMutationContext;
      },
      onError: (_error, _variables, context) => {
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

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isSendDisabled || !conversation) return;
      const value = trimmedDraft;
      if (!value) return;

      mutation.mutate({ text: value });
      setDraft("");
    },
    [conversation, isSendDisabled, mutation, trimmedDraft],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        if (!isSendDisabled && conversation) {
          const form = event.currentTarget.form;
          form?.requestSubmit();
        }
      }
    },
    [conversation, isSendDisabled],
  );

  return (
    <footer className="border-t border-border/60 bg-muted/15 px-6 py-4">
      <form className="space-y-3" onSubmit={handleSubmit}>
        <Textarea
          key={conversation?.id}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            conversation
              ? "Type your reply…"
              : "Select a conversation to start messaging"
          }
          disabled={!conversation}
          className="min-h-[90px] resize-none"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Status: Open</Badge>
            <div className="flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              Attachments coming soon
            </div>
          </div>
          <Button size="sm" type="submit" disabled={isSendDisabled}>
            <Send className="mr-2 h-4 w-4" />
            Send
          </Button>
        </div>
      </form>
    </footer>
  );
}
