import type { AllPlatforms } from "@shared";
import type { InboxConversationSummary, InboxMessage } from "@shared/inbox";

export type { InboxConversationSummary, InboxMessage } from "@shared/inbox";

export type InboxChannel = InboxMessage["channel"];
export type InboxFiltersState = {
  workspaceSlug: string | null;
  selectedPlatform: AllPlatforms | null;
  selectedChannel: InboxChannel | null;
  connectedAccountId: string | null;
  search: string | null;
};

export type InboxFiltersActions = {
  initializeFilters(workspaceSlug: string): void;
  setPlatform(platform: AllPlatforms | null): void;
  setChannel(channel: InboxChannel | null): void;
  setConnectedAccount(connectedAccountId: string | null): void;
  setSearch(search: string): void;
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
  appendMessages(payload: {
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
