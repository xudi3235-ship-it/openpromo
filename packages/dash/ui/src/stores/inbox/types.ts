import type {
  InboxConversationSummary,
  InboxMessage,
  InboxPlatform,
} from "@shared/inbox";

export type { InboxConversationSummary, InboxMessage } from "@shared/inbox";

export type InboxChannel = InboxMessage["channel"];
export type InboxMessageStatus = "open" | "snoozed" | "resolved";

export type InboxMessageWithState = InboxMessage & {
  status?: InboxMessageStatus;
  assigneeId?: string | null;
  labels?: string[];
};

export type InboxFiltersState = {
  workspaceSlug: string | null;
  selectedPlatform: InboxPlatform | null;
  selectedChannel: InboxChannel | null;
  connectedAccountId: string | null;
  search: string;
  statusFilter: InboxMessageStatus[];
  assigneeFilter: string | "unassigned" | null;
};

export type InboxFiltersActions = {
  initializeFilters(workspaceSlug: string): void;
  setPlatform(platform: InboxPlatform | null): void;
  setChannel(channel: InboxChannel | null): void;
  setConnectedAccount(connectedAccountId: string | null): void;
  setSearch(search: string): void;
  setStatusFilter(status: InboxMessageStatus[]): void;
  setAssigneeFilter(assignee: string | "unassigned" | null): void;
  clearFilters(): void;
};

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
  upsertConversation(conversation: InboxConversationSummary): void;
  selectConversation(conversationId: string | null): void;
  setConversationLoadingState(state: "idle" | "loading" | "error"): void;
};

export type InboxThreadState = {
  items: InboxMessageWithState[];
  itemsById: Record<string, InboxMessageWithState>;
  page: number;
  pageSize: number;
  total: number;
  isFetching: boolean;
  hasMore: boolean;
};

export type InboxMessagesState = {
  currentConversationId: string | null;
  threads: Record<string, InboxThreadState>;
  pendingMutations: Record<
    string,
    {
      conversationId: string;
      type: "status" | "assignee" | "labels";
      timestamp: number;
    }
  >;
};

export type InboxMessagesActions = {
  initializeThread(conversationId: string): void;
  setMessages(payload: {
    conversationId: string;
    items: InboxMessageWithState[];
    page: number;
    pageSize: number;
    total: number;
    reset?: boolean;
  }): void;
  appendMessages(payload: {
    conversationId: string;
    items: InboxMessageWithState[];
  }): void;
  updateMessage(payload: {
    conversationId: string;
    messageId: string;
    patch: Partial<InboxMessageWithState>;
  }): void;
  setThreadFetching(conversationId: string, isFetching: boolean): void;
  setThreadHasMore(conversationId: string, hasMore: boolean): void;
  optimisticUpdate(payload: {
    conversationId: string;
    messageId: string;
    patch: Partial<InboxMessageWithState>;
    type: "status" | "assignee" | "labels";
  }): void;
  clearOptimistic(conversationId: string, messageId: string): void;
};

export type InboxUIState = {
  isNewMessageComposerOpen: boolean;
  isFiltersOpen: boolean;
  activeSidebarTab: "details" | "contact" | "activity";
  splitPaneSizes: [number, number];
  hoveredConversationId: string | null;
};

export type InboxUIActions = {
  setNewMessageComposerOpen(open: boolean): void;
  toggleFilters(): void;
  setActiveSidebarTab(tab: InboxUIState["activeSidebarTab"]): void;
  setSplitPaneSizes(sizes: [number, number]): void;
  setHoveredConversation(conversationId: string | null): void;
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
};

export type InboxStore = InboxFiltersState &
  InboxFiltersActions &
  InboxConversationsState &
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
