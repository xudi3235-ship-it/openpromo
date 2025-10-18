import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@openpromo/ui/components/avatar";
import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import { Input } from "@openpromo/ui/components/input";
import { ScrollArea, ScrollBar } from "@openpromo/ui/components/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@openpromo/ui/components/select";
import { Textarea } from "@openpromo/ui/components/textarea";
import { cn } from "@openpromo/ui/lib/utils";
import type { InboxConversationSummary, InboxPlatform } from "@shared/inbox";
import { format, formatDistanceToNow } from "date-fns";
import {
  MessageSquare,
  Paperclip,
  Search,
  Send,
  Sparkles,
  Tag,
} from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { Main } from "@/components/layout/main";
import { Route } from "@/routes/_authenticated/workspaces/$workspaceSlug/inbox";
import type { InboxChannel, InboxMessage } from "@/stores/inbox/types";
import { useInboxStore } from "@/stores/inbox-store";

const environment = import.meta.env.VITE_ENVIRONMENT;
const USE_MOCK_DATA = environment === "local";

const MOCK_CONVERSATIONS: InboxConversationSummary[] = [
  {
    id: "conv-1",
    platform: "INSTAGRAM",
    channel: "dm",
    lastMessageAt: new Date(Date.now() - 5 * 60 * 1000),
    contact: {
      id: "contact-ig-1",
      name: "Emily Chen",
      profilePicUrl: "https://i.pravatar.cc/150?img=47",
    },
    connectedAccount: {
      id: "acc-ig-1",
      accountName: "@sunnycafe",
    },
    contentId: null,
    externalThreadId: null,
  },
  {
    id: "conv-2",
    platform: "FACEBOOK",
    channel: "post_comment",
    lastMessageAt: new Date(Date.now() - 45 * 60 * 1000),
    contact: {
      id: "contact-fb-1",
      name: "Robert Garcia",
      profilePicUrl: "https://i.pravatar.cc/150?img=32",
    },
    connectedAccount: {
      id: "acc-fb-1",
      accountName: "Sunny Coffee Facebook",
    },
    contentId: "content-1",
    externalThreadId: "fb-comment-thread-22",
  },
  {
    id: "conv-3",
    platform: "INSTAGRAM",
    channel: "dm",
    lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    contact: {
      id: "contact-ig-2",
      name: "Studio Bloom",
      profilePicUrl: "",
    },
    connectedAccount: {
      id: "acc-ig-1",
      accountName: "@sunnycafe",
    },
    contentId: null,
    externalThreadId: null,
  },
];

const MOCK_MESSAGES: Record<string, InboxMessage[]> = {
  "conv-1": [
    {
      id: "conv-1-msg-1",
      externalId: "msg-001",
      sender: "user",
      channel: "dm",
      text: "Hey there! We loved the latte art in your recent post. Do you take catering orders for private events?",
      attachments: [],
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
      contentId: null,
      metadata: {},
    },
    {
      id: "conv-1-msg-2",
      externalId: "msg-002",
      sender: "self",
      channel: "dm",
      text: "Hi Emily! Thanks so much. Yes, we cater events up to 80 guests. I can share our seasonal menu if that helps.",
      attachments: [],
      createdAt: new Date(Date.now() - 12 * 60 * 1000),
      contentId: null,
      metadata: {},
    },
    {
      id: "conv-1-msg-3",
      externalId: "msg-003",
      sender: "user",
      channel: "dm",
      text: "That would be great! We're looking at an outdoor brunch in June.",
      attachments: [],
      createdAt: new Date(Date.now() - 5 * 60 * 1000),
      contentId: null,
      metadata: {},
    },
  ],
  "conv-2": [
    {
      id: "conv-2-msg-1",
      externalId: "msg-101",
      sender: "user",
      channel: "post_comment",
      text: "The new single-origin roast is unreal! Do you ship internationally?",
      attachments: [],
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      contentId: "content-1",
      metadata: {
        referencedPost: "Sunny Coffee — Launching Ethiopia Single Origin",
      },
    },
    {
      id: "conv-2-msg-2",
      externalId: "msg-102",
      sender: "self",
      channel: "post_comment",
      text: "Thanks Robert! We ship across the US right now and are working on EU fulfilment this summer.",
      attachments: [],
      createdAt: new Date(Date.now() - 46 * 60 * 1000),
      contentId: "content-1",
      metadata: {},
    },
  ],
  "conv-3": [
    {
      id: "conv-3-msg-1",
      externalId: "msg-201",
      sender: "user",
      channel: "dm",
      text: "Could we collaborate on a giveaway? We can shoot content at your space.",
      attachments: [
        {
          type: "image",
          url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80",
        },
      ],
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      contentId: null,
      metadata: {},
    },
    {
      id: "conv-3-msg-2",
      externalId: "msg-202",
      sender: "self",
      channel: "dm",
      text: "Love that idea! Let me share it with the team and circle back.",
      attachments: [],
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      contentId: null,
      metadata: {},
    },
  ],
};

export function Inbox() {
  const { workspaceSlug } = Route.useParams();
  const mockLoadedRef = useRef(false);

  const initialize = useInboxStore((state) => state.initialize);
  const setConversations = useInboxStore((state) => state.setConversations);
  const selectConversation = useInboxStore((state) => state.selectConversation);
  const setMessages = useInboxStore((state) => state.setMessages);
  const setSearch = useInboxStore((state) => state.setSearch);
  const setChannel = useInboxStore((state) => state.setChannel);
  const setPlatform = useInboxStore((state) => state.setPlatform);

  const search = useInboxStore((state) => state.search);
  const selectedPlatform = useInboxStore((state) => state.selectedPlatform);
  const selectedChannel = useInboxStore((state) => state.selectedChannel);
  const conversationOrder = useInboxStore((state) => state.order);
  const conversationMap = useInboxStore((state) => state.byId);
  const threads = useInboxStore((state) => state.threads);
  const selectedConversationId = useInboxStore(
    (state) => state.selectedConversationId,
  );
  const currentConversationId = useInboxStore(
    (state) => state.currentConversationId,
  );

  useEffect(() => {
    initialize(workspaceSlug);
  }, [workspaceSlug, initialize]);

  useEffect(() => {
    if (!USE_MOCK_DATA || mockLoadedRef.current) return;
    mockLoadedRef.current = true;

    setConversations({
      conversations: MOCK_CONVERSATIONS,
      pagination: {
        page: 1,
        pageSize: MOCK_CONVERSATIONS.length,
        total: MOCK_CONVERSATIONS.length,
        isFetching: false,
      },
      replace: true,
    });

    for (const conversation of MOCK_CONVERSATIONS) {
      const items = MOCK_MESSAGES[conversation.id] ?? [];
      setMessages({
        conversationId: conversation.id,
        items,
        page: 1,
        pageSize: 50,
        total: items.length,
        reset: true,
      });
    }

    if (MOCK_CONVERSATIONS.length > 0) {
      selectConversation(MOCK_CONVERSATIONS[0].id);
    }
  }, [setConversations, setMessages, selectConversation]);

  const conversations = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    return conversationOrder
      .map((id) => conversationMap[id])
      .filter((conversation): conversation is InboxConversationSummary =>
        Boolean(conversation),
      )
      .filter((conversation) => {
        if (selectedChannel && conversation.channel !== selectedChannel) {
          return false;
        }
        if (selectedPlatform && conversation.platform !== selectedPlatform) {
          return false;
        }
        if (!searchTerm) return true;
        const haystacks = [
          conversation.contact.name,
          conversation.connectedAccount.accountName ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return haystacks.includes(searchTerm);
      });
  }, [
    conversationOrder,
    conversationMap,
    selectedChannel,
    selectedPlatform,
    search,
  ]);

  const activeConversation = currentConversationId
    ? (conversationMap[currentConversationId] ?? null)
    : null;
  const activeThread = currentConversationId
    ? threads[currentConversationId]
    : undefined;
  const activeMessages = activeThread?.items ?? [];

  return (
    <Main fixed>
      <div className="flex h-full min-h-[640px] gap-6">
        <aside className="flex w-full max-w-md flex-col rounded-xl border border-border/60 bg-background sm:w-80 lg:w-96">
          <header className="rounded-t-xl border-b border-border/60 bg-muted/20 px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold">Inbox</h1>
                <p className="text-xs text-muted-foreground">
                  Manage conversations across platforms
                </p>
              </div>
              <Badge
                variant="secondary"
                className="flex items-center gap-1 text-xs font-normal"
              >
                <MessageSquare className="h-3 w-3" />
                {conversations.length}
              </Badge>
            </div>
            <div className="mt-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search contacts or conversations"
                  className="pl-9 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Select
                  value={selectedChannel ?? "__all__"}
                  onValueChange={(value) =>
                    setChannel(
                      value === "__all__" ? null : (value as InboxChannel),
                    )
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Channels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All channels</SelectItem>
                    <SelectItem value="dm">Direct messages</SelectItem>
                    <SelectItem value="post_comment">Post comments</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={selectedPlatform ?? "__all__"}
                  onValueChange={(value) =>
                    setPlatform(
                      value === "__all__" ? null : (value as InboxPlatform),
                    )
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All platforms</SelectItem>
                    <SelectItem value="FACEBOOK">Facebook</SelectItem>
                    <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                    <SelectItem value="TIKTOK">TikTok</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </header>
          <ScrollArea className="flex-1">
            <ul className="space-y-1 p-3">
              {conversations.map((conversation) => {
                const thread = threads[conversation.id];
                const lastMessage =
                  thread?.items[thread.items.length - 1] ?? null;
                const previewText =
                  lastMessage?.text ??
                  (lastMessage?.attachments?.length
                    ? `${lastMessage.attachments.length} attachment${
                        lastMessage.attachments.length > 1 ? "s" : ""
                      }`
                    : "No messages yet");
                const previewTime =
                  lastMessage?.createdAt ?? conversation.lastMessageAt;
                const isSelected = selectedConversationId === conversation.id;
                return (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => selectConversation(conversation.id)}
                      className={cn(
                        "w-full rounded-lg border border-transparent p-3 text-left transition-colors",
                        isSelected
                          ? "border-primary/50 bg-primary/5"
                          : "hover:border-border/70 hover:bg-muted/20",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          {conversation.contact.profilePicUrl ? (
                            <AvatarImage
                              src={conversation.contact.profilePicUrl}
                              alt={conversation.contact.name}
                            />
                          ) : (
                            <AvatarFallback>
                              {getInitials(conversation.contact.name)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="truncate text-sm font-medium">
                              {conversation.contact.name}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(previewTime, {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <Badge variant="outline" className="capitalize">
                              {conversation.channel === "dm"
                                ? "Direct message"
                                : "Post comment"}
                            </Badge>
                            <span>
                              {conversation.connectedAccount.accountName}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {previewText}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
              {conversations.length === 0 && (
                <li className="rounded-md border border-dashed border-border/60 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
                  No conversations match the current filters.
                </li>
              )}
            </ul>
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </aside>

        <section className="flex flex-1 flex-col rounded-xl border border-border/60 bg-background">
          {activeConversation ? (
            <>
              <header className="flex items-start justify-between gap-4 border-b border-border/60 px-6 py-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    {activeConversation.contact.profilePicUrl ? (
                      <AvatarImage
                        src={activeConversation.contact.profilePicUrl}
                        alt={activeConversation.contact.name}
                      />
                    ) : (
                      <AvatarFallback>
                        {getInitials(activeConversation.contact.name)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <h2 className="font-semibold">
                      {activeConversation.contact.name}
                    </h2>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">
                        {activeConversation.connectedAccount.accountName ??
                          "Connected account"}
                      </Badge>
                      <Badge variant="secondary" className="capitalize">
                        {activeConversation.channel === "dm"
                          ? "Direct message"
                          : "Post comment"}
                      </Badge>
                      <span>
                        Last activity{" "}
                        {formatDistanceToNow(activeConversation.lastMessageAt, {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm">
                    <Tag className="mr-2 h-4 w-4" />
                    Add label
                  </Button>
                  <Button variant="outline" size="sm">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Summarize
                  </Button>
                </div>
              </header>
              <ScrollArea className="flex-1 px-6 py-6">
                <div className="space-y-4">
                  {activeMessages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                  {activeMessages.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                      No messages yet. Messages will appear here when fetched
                      from the platform.
                    </div>
                  )}
                </div>
                <ScrollBar orientation="vertical" />
              </ScrollArea>
              <footer className="border-t border-border/60 bg-muted/15 px-6 py-4">
                <Textarea
                  placeholder="Type a reply… (coming soon)"
                  disabled
                  className="min-h-[90px] resize-none"
                />
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Status: Open</Badge>
                    <div className="flex items-center gap-1">
                      <Paperclip className="h-3 w-3" />
                      Attachments coming soon
                    </div>
                  </div>
                  <Button size="sm" disabled>
                    <Send className="mr-2 h-4 w-4" />
                    Send
                  </Button>
                </div>
              </footer>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="rounded-full border border-border bg-muted/40 p-4">
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Select a conversation</h2>
                <p className="text-sm text-muted-foreground">
                  Choose a conversation on the left to view messages. New
                  message actions are coming soon.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </Main>
  );
}

type MessageBubbleProps = {
  message: InboxMessage;
};

function MessageBubble({ message }: MessageBubbleProps) {
  const isSelf = message.sender === "self";
  const timestamp = format(message.createdAt, "MMM d, h:mm a");
  const hasAttachments = message.attachments?.length
    ? message.attachments.length > 0
    : false;

  return (
    <div
      className={cn(
        "flex w-full gap-3",
        isSelf ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[72%] rounded-lg border px-4 py-3 text-sm transition-colors",
          isSelf
            ? "border-primary/30 bg-primary/10 text-foreground"
            : "border-border/60 bg-background text-foreground",
        )}
      >
        <div className="flex items-center justify-between gap-2 text-xs">
          <span
            className={cn(
              isSelf ? "text-muted-foreground" : "text-muted-foreground",
            )}
          >
            {isSelf ? "You" : "Customer"}
          </span>
          <span className={cn("text-muted-foreground")}>{timestamp}</span>
        </div>
        {message.text && (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
            {message.text}
          </p>
        )}
        {hasAttachments && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            <Paperclip className="h-3 w-3" />
            <span>
              {message.attachments.length} attachment
              {message.attachments.length > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function getInitials(name: string) {
  const [first = "", second = ""] = name.split(" ");
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
}
