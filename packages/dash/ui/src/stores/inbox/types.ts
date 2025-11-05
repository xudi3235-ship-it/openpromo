import type { InboxConversationSummary, InboxMessage } from "@shared/inbox";

export type { InboxConversationSummary, InboxMessage } from "@shared/inbox";

export type InboxChannel = InboxMessage["channel"];

export type InboxConversationPagination = {
  page: number;
  pageSize: number;
  total: number;
  isFetching: boolean;
};

export type InboxConversationsState = {
  byId: Record<string, InboxConversationSummary>;
  order: string[];
  selectedConversationId: string | null;
  pagination: InboxConversationPagination;
  loadingState: "idle" | "loading" | "error";
};

export type InboxConversationsActions = {
  setConversations(payload: {
    conversations: InboxConversationSummary[];
    pagination: InboxConversationPagination;
    replace?: boolean;
  }): void;
  /** Merges conversations from query, only replacing on initial load */
  syncConversationsFromQuery(payload: {
    conversations: InboxConversationSummary[];
    pagination: InboxConversationPagination;
    isInitialLoad: boolean;
  }): void;
  upsertConversation(conversation: InboxConversationSummary): void;
  removeConversation(conversationId: string): void;
  selectConversation(conversationId: string | null): void;
  setConversationLoadingState(state: "idle" | "loading" | "error"): void;
};

export type InboxThreadState = {
  items: InboxMessage[];
  itemsById: Record<string, InboxMessage>;
  page: number;
  pageSize: number;
  total: number;
  isFetching: boolean;
  hasMore: boolean;
};

export type InboxMessagesState = {
  currentConversationId: string | null;
  threads: Record<string, InboxThreadState>;
};

export type InboxMessagesActions = {
  initializeThread(conversationId: string): void;
  setMessages(payload: {
    conversationId: string;
    items: InboxMessage[];
    page: number;
    pageSize: number;
    total: number;
    reset?: boolean;
  }): void;
  /** Syncs messages from query, only resetting on initial load */
  syncMessagesFromQuery(payload: {
    conversationId: string;
    items: InboxMessage[];
    page: number;
    pageSize: number;
    total: number;
    hasNextPage: boolean;
    isInitialLoad: boolean;
  }): void;
  appendMessages(payload: {
    conversationId: string;
    items: InboxMessage[];
  }): void;
  /** Appends messages from websocket, ensuring thread is initialized */
  appendMessagesFromWebSocket(payload: {
    conversationId: string;
    items: InboxMessage[];
  }): void;
  removeMessage(payload: { conversationId: string; messageId: string }): void;
  updateMessage(payload: {
    conversationId: string;
    messageId: string;
    patch: Partial<InboxMessage>;
  }): void;
  setThreadFetching(conversationId: string, isFetching: boolean): void;
  setThreadHasMore(conversationId: string, hasMore: boolean): void;
};

export type InboxUIState = {
  isNewMessageComposerOpen: boolean;
  isFiltersOpen: boolean;
  activeSidebarTab: "details" | "contact" | "activity";
  splitPaneSizes: [number, number];
  hoveredConversationId: string | null;
  composerDrafts: Record<string, string>;
  composerReplyTargets: Record<string, string | null>;
  activeQuickReplyId: string | null;
};

export type InboxUIActions = {
  setNewMessageComposerOpen(open: boolean): void;
  toggleFilters(): void;
  setActiveSidebarTab(tab: InboxUIState["activeSidebarTab"]): void;
  setSplitPaneSizes(sizes: [number, number]): void;
  setHoveredConversation(conversationId: string | null): void;
  setComposerDraft(conversationId: string, draft: string): void;
  clearComposerDraft(conversationId: string): void;
  setComposerReplyTarget(
    conversationId: string,
    messageId: string | null,
  ): void;
  clearComposerReplyTarget(conversationId: string): void;
  setActiveQuickReply(conversationId: string | null): void;
};

export type InboxRealtimeState = {
  lastEventTimestamp: number | null;
};

export type InboxRealtimeActions = {
  applyRealtimeEvent(event: {
    type: "conversation.upserted" | "message.upserted";
    conversationId: string;
    data: unknown;
    timestamp: number;
  }): void;
  /** Handles conversation.upserted websocket event */
  handleConversationUpserted(payload: {
    conversationId: string;
    lastMessageAt: Date;
    contact: InboxConversationSummary["contact"];
    isUnread?: boolean;
    lastReadAt?: Date | null;
  }): void;
  /** Handles message.upserted websocket event */
  handleMessageUpserted(payload: {
    conversationId: string;
    message: InboxMessage;
  }): void;
};

export type InboxStore = InboxConversationsState &
  InboxConversationsActions &
  InboxMessagesState &
  InboxMessagesActions &
  InboxUIState &
  InboxUIActions &
  InboxRealtimeState &
  InboxRealtimeActions & {
    initialize(workspaceSlug: string): void;
    reset(): void;
  };
