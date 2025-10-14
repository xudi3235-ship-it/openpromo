import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@openpromo/ui/components/avatar";
import { Button } from "@openpromo/ui/components/button";
import { ScrollArea } from "@openpromo/ui/components/scroll-area";
import { Separator } from "@openpromo/ui/components/separator";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@openpromo/ui/components/tooltip";
import { cn } from "@openpromo/ui/lib/utils";
import {
  InboxRealtimeEventSchema,
  InboxRealtimeEventTypes,
} from "@shared/inbox";
import { useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Edit,
  ImagePlus,
  Loader2,
  MessagesSquare,
  MoreVertical,
  Paperclip,
  Phone,
  Plus,
  Search as SearchIcon,
  Send,
  Video,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Fragment } from "react/jsx-runtime";
import { Main } from "@/components/layout/main";
import {
  type GenericEvent,
  useWorkspaceNotifications,
} from "@/hooks/useWorkspaceNotifications";
import {
  useInboxConversations,
  useInboxMessages,
  useSendInboxMessage,
} from "@/queries/inbox";
import { Route } from "@/routes/_authenticated/workspaces/$workspaceSlug/inbox";
import { NewChat } from "./new-chat";

export function Inbox() {
  const queryClient = useQueryClient();
  const { workspaceSlug } = Route.useParams();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [pendingMessagesByConversation, setPendingMessagesByConversation] =
    useState<Record<string, string>>({});
  const [platformFilter] = useState<
    "FACEBOOK" | "INSTAGRAM" | "TIKTOK" | undefined
  >(undefined);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [mobileSelectedConversationId, setMobileSelectedConversationId] =
    useState<string | null>(null);
  const [createConversationDialogOpened, setCreateConversationDialog] =
    useState(false);

  const { data: convoData, isLoading: isConvosLoading } = useInboxConversations(
    workspaceSlug,
    {
      page,
      pageSize,
      q: search.trim() || undefined,
      platform: platformFilter,
    },
  );
  const conversationsList = convoData?.items ?? [];
  const selectedConversation = useMemo(
    () =>
      conversationsList.find((c) => c.id === selectedConversationId) || null,
    [conversationsList, selectedConversationId],
  );
  const selectedConversationPendingMessage = useMemo(
    () =>
      selectedConversationId
        ? pendingMessagesByConversation[selectedConversationId]
        : undefined,
    [pendingMessagesByConversation, selectedConversationId],
  );

  const { data: messagesData, isLoading: isMessagesLoading } = useInboxMessages(
    workspaceSlug,
    selectedConversationId ?? undefined,
    { page: 1, pageSize: 50 },
  );
  const messages = messagesData?.items ?? [];
  const sendMessage = useSendInboxMessage(
    workspaceSlug,
    selectedConversationId ?? undefined,
  );

  const clearPendingState = useCallback((conversationId: string) => {
    setPendingMessagesByConversation((prev) => {
      if (!(conversationId in prev)) return prev;
      const { [conversationId]: _cleared, ...rest } = prev;
      return rest;
    });
  }, []);

  const onEvent = useCallback(
    (event: GenericEvent) => {
      const inboxRealtimeEvent = InboxRealtimeEventSchema.safeParse(event);
      if (!inboxRealtimeEvent.success) {
        return;
      }
      if (
        inboxRealtimeEvent.data.type ===
        InboxRealtimeEventTypes.ConversationUpserted
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
        inboxRealtimeEvent.data.type === InboxRealtimeEventTypes.MessageUpserted
      ) {
        // Clear pending state for the conversation that just received a message
        const conversationId = inboxRealtimeEvent.data.conversationId;
        clearPendingState(conversationId);
        queryClient.invalidateQueries({
          predicate: (q) => {
            const key = q.queryKey as unknown[];
            return (
              Array.isArray(key) &&
              key[0] === "inbox" &&
              key[1] === "messages" &&
              key[2] === workspaceSlug &&
              key[3] === inboxRealtimeEvent.data.conversationId
            );
          },
        });
      }
    },
    [workspaceSlug, queryClient, clearPendingState],
  );

  useWorkspaceNotifications(workspaceSlug, {
    autoToast: false,
    onEvent,
  });

  return (
    <Main fixed>
      <section className="flex min-h-0 flex-1 gap-6">
        {/* Left Side */}
        <div className="flex w-full flex-col gap-2 sm:w-56 lg:w-72 2xl:w-80">
          <div className="bg-background sticky top-0 z-10 -mx-4 px-4 pb-3 shadow-md sm:static sm:z-auto sm:mx-0 sm:p-0 sm:shadow-none">
            <div className="flex items-center justify-between py-2">
              <div className="flex gap-2">
                <h1 className="text-2xl font-bold">Inbox</h1>
                <MessagesSquare size={20} />
              </div>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => setCreateConversationDialog(true)}
                className="rounded-lg"
              >
                <Edit size={24} className="stroke-muted-foreground" />
              </Button>
            </div>

            <label
              className={cn(
                "focus-within:ring-ring focus-within:ring-1 focus-within:outline-hidden",
                "border-border flex h-10 w-full items-center space-x-0 rounded-md border ps-2",
              )}
            >
              <SearchIcon size={15} className="me-2 stroke-slate-500" />
              <span className="sr-only">Search</span>
              <input
                type="text"
                className="w-full flex-1 bg-inherit text-sm focus-visible:outline-hidden"
                placeholder="Search chat..."
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
              />
            </label>
          </div>

          <ScrollArea className="-mx-3 h-full overflow-scroll p-3">
            {isConvosLoading && (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            )}
            {conversationsList.map((convo) => {
              const { id, contact } = convo;
              const lastMsg = format(
                new Date(convo.lastMessageAt),
                "d MMM, yyyy h:mm a",
              );
              return (
                <Fragment key={id}>
                  <button
                    type="button"
                    className={cn(
                      "group hover:bg-accent hover:text-accent-foreground",
                      `flex w-full rounded-md px-2 py-2 text-start text-sm`,
                      selectedConversationId === id && "sm:bg-muted",
                    )}
                    onClick={() => {
                      setSelectedConversationId(id);
                      setMobileSelectedConversationId(id);
                    }}
                  >
                    <div className="flex gap-2">
                      <Avatar>
                        <AvatarImage
                          src={contact.profilePicUrl}
                          alt={contact.name}
                        />
                        <AvatarFallback>{contact.name}</AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="col-start-2 row-span-2 font-medium">
                          {contact.name}
                        </span>
                        <span className="text-muted-foreground group-hover:text-accent-foreground/90 col-start-2 row-span-2 row-start-2 line-clamp-2 text-ellipsis">
                          {lastMsg}
                        </span>
                      </div>
                    </div>
                  </button>
                  <Separator className="my-1" />
                </Fragment>
              );
            })}
          </ScrollArea>
        </div>

        {/* Right Side */}
        {selectedConversation ? (
          <div
            className={cn(
              "bg-background absolute inset-0 start-full z-50 hidden w-full flex-1 min-h-0 flex-col border shadow-xs sm:static sm:z-auto sm:flex sm:rounded-md",
              mobileSelectedConversationId && "start-0 flex",
            )}
          >
            {/* Top Part */}
            <div className="bg-card mb-1 flex flex-none justify-between p-4 shadow-lg sm:rounded-t-md">
              {/* Left */}
              <div className="flex gap-3">
                <Button
                  size="icon"
                  variant="ghost"
                  className="-ms-2 h-full sm:hidden"
                  onClick={() => setMobileSelectedConversationId(null)}
                >
                  <ArrowLeft className="rtl:rotate-180" />
                </Button>
                <div className="flex items-center gap-2 lg:gap-4">
                  <Avatar className="size-9 lg:size-11">
                    <AvatarImage
                      src={selectedConversation.contact.profilePicUrl}
                      alt={selectedConversation.contact.name}
                    />
                    <AvatarFallback>
                      {selectedConversation.contact.name}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="col-start-2 row-span-2 text-sm font-medium lg:text-base">
                      {selectedConversation.contact.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right */}
              <div className="-me-1 flex items-center gap-1 lg:gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="hidden size-8 rounded-full sm:inline-flex lg:size-10"
                >
                  <Video size={22} className="stroke-muted-foreground" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="hidden size-8 rounded-full sm:inline-flex lg:size-10"
                >
                  <Phone size={22} className="stroke-muted-foreground" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 rounded-md sm:h-8 sm:w-4 lg:h-10 lg:w-6"
                >
                  <MoreVertical className="stroke-muted-foreground sm:size-5" />
                </Button>
              </div>
            </div>

            {/* Conversation */}
            <div className="flex flex-1 min-h-0 flex-col gap-2 rounded-md px-4 pt-0 pb-4">
              <div className="flex size-full flex-1 min-h-0">
                <div className="chat-text-container relative -me-4 flex flex-1 min-h-0 flex-col overflow-y-hidden">
                  <div className="chat-flex flex w-full flex-1 min-h-0 flex-col-reverse justify-start gap-4 overflow-y-auto py-2 pe-4 pb-4">
                    {isMessagesLoading && (
                      <div className="space-y-2 w-full">
                        <Skeleton className="h-10 w-2/3 self-start" />
                        <Skeleton className="h-10 w-1/2 self-end" />
                        <Skeleton className="h-10 w-2/5 self-start" />
                      </div>
                    )}
                    {!!selectedConversationPendingMessage && (
                      <div
                        className={cn(
                          "chat-box max-w-72 px-3 py-2 break-words shadow-lg",
                          "bg-primary/60 text-primary-foreground/75 self-end rounded-[16px_16px_0_16px] opacity-80",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Loader2
                            className="animate-spin opacity-90"
                            size={14}
                          />
                          <span className="italic opacity-90">
                            {selectedConversationPendingMessage}
                          </span>
                        </div>
                      </div>
                    )}
                    {messages.map((msg) => (
                      <div
                        key={msg.id + msg.externalId}
                        className={cn(
                          "chat-box max-w-72 px-3 py-2 break-words shadow-lg",
                          msg.sender === "self"
                            ? "bg-primary/90 text-primary-foreground/75 self-end rounded-[16px_16px_0_16px]"
                            : "bg-muted self-start rounded-[16px_16px_16px_0]",
                        )}
                      >
                        {msg.text ||
                          (!msg.attachments?.length && <UnsupportedMessage />)}
                        {msg.attachments?.length ? (
                          <div className="mt-2 space-y-2">
                            {msg.attachments.map((att) => (
                              <AttachmentPreview
                                key={att.url}
                                type={att.type}
                                url={att.url}
                              />
                            ))}
                          </div>
                        ) : null}
                        <TooltipProvider>
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                              <span
                                className={cn(
                                  "text-foreground/75 mt-1 block text-xs font-light italic w-fit",
                                  msg.sender === "self" &&
                                    "text-primary-foreground/85 text-end",
                                )}
                              >
                                {formatDistanceToNow(new Date(msg.createdAt), {
                                  addSuffix: true,
                                })}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {format(new Date(msg.createdAt), "PPpp")}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    ))}

                    {!isMessagesLoading && messages.length === 0 && (
                      <div className="text-center text-sm text-muted-foreground w-full">
                        No messages yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <form
                className="flex w-full flex-none gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget as HTMLFormElement;
                  const input = form.querySelector<HTMLInputElement>(
                    'input[name="chatMessage"]',
                  );
                  const value = input?.value?.trim();
                  if (!value) return;
                  const idSnapshot = selectedConversationId;
                  if (idSnapshot) {
                    setPendingMessagesByConversation((prev) => ({
                      ...prev,
                      [idSnapshot]: value,
                    }));
                  }
                  sendMessage.mutate(
                    { text: value },
                    {
                      onError: () => {
                        if (!idSnapshot) return;
                        clearPendingState(idSnapshot);
                      },
                    },
                  );
                  if (input) input.value = "";
                }}
              >
                <div className="border-input bg-card focus-within:ring-ring flex flex-1 items-center gap-2 rounded-md border px-2 py-1 focus-within:ring-1 focus-within:outline-hidden lg:gap-4">
                  <div className="space-x-1">
                    <Button
                      size="icon"
                      type="button"
                      variant="ghost"
                      className="h-8 rounded-md"
                    >
                      <Plus size={20} className="stroke-muted-foreground" />
                    </Button>
                    <Button
                      size="icon"
                      type="button"
                      variant="ghost"
                      className="hidden h-8 rounded-md lg:inline-flex"
                    >
                      <ImagePlus
                        size={20}
                        className="stroke-muted-foreground"
                      />
                    </Button>
                    <Button
                      size="icon"
                      type="button"
                      variant="ghost"
                      className="hidden h-8 rounded-md lg:inline-flex"
                    >
                      <Paperclip
                        size={20}
                        className="stroke-muted-foreground"
                      />
                    </Button>
                  </div>
                  <label className="flex-1">
                    <span className="sr-only">Chat Text Box</span>
                    <input
                      type="text"
                      name="chatMessage"
                      placeholder="Type your messages..."
                      className="h-8 w-full bg-inherit focus-visible:outline-hidden"
                      disabled={!!selectedConversationPendingMessage}
                    />
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden sm:inline-flex"
                    disabled={!!selectedConversationPendingMessage}
                  >
                    <Send size={20} />
                  </Button>
                </div>
                <Button
                  className="h-full sm:hidden"
                  disabled={!!selectedConversationPendingMessage}
                >
                  {selectedConversationPendingMessage ? (
                    <Loader2 className="mr-2 animate-spin" size={18} />
                  ) : (
                    <Send className="mr-2" size={18} />
                  )}
                  Send
                </Button>
              </form>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "bg-card absolute inset-0 start-full z-50 hidden w-full flex-1 flex-col justify-center rounded-md border shadow-xs sm:static sm:z-auto sm:flex",
            )}
          >
            <div className="flex flex-col items-center space-y-6">
              <div className="border-border flex size-16 items-center justify-center rounded-full border-2">
                <MessagesSquare className="size-8" />
              </div>
              <div className="space-y-2 text-center">
                <h1 className="text-xl font-semibold">Your messages</h1>
                <p className="text-muted-foreground text-sm">
                  Send a message to start a chat.
                </p>
              </div>
              <Button onClick={() => setCreateConversationDialog(true)}>
                Send message
              </Button>
            </div>
          </div>
        )}
      </section>
      <NewChat
        users={[]}
        onOpenChange={setCreateConversationDialog}
        open={createConversationDialogOpened}
      />
    </Main>
  );
}

function AttachmentPreview({ type, url }: { type: string; url: string }) {
  if (type === "image") {
    return (
      <img
        src={url}
        alt="attachment"
        className="max-h-60 max-w-[18rem] rounded"
        loading="lazy"
      />
    );
  }
  if (type === "video") {
    return (
      <video src={url} controls className="max-h-60 max-w-[18rem] rounded" />
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="underline text-primary break-all"
    >
      View attachment
    </a>
  );
}

function UnsupportedMessage() {
  return (
    <div className="italic">
      Unsupported message type. View it on the source platform.
    </div>
  );
}
