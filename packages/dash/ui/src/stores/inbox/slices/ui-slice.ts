import type { StateCreator } from "zustand";
import type { InboxStore, InboxUIActions, InboxUIState } from "../types";

export const uiInitialState: InboxUIState = {
  isNewMessageComposerOpen: false,
  isFiltersOpen: false,
  activeSidebarTab: "details",
  splitPaneSizes: [35, 65],
  hoveredConversationId: null,
  composerDrafts: {},
  composerReplyTargets: {},
  activeQuickReplyId: null,
};

export const createUISlice: StateCreator<
  InboxStore,
  [["zustand/immer", never]],
  [],
  InboxUIState & InboxUIActions
> = (set) => ({
  ...uiInitialState,

  setNewMessageComposerOpen: (open) =>
    set((state) => {
      state.isNewMessageComposerOpen = open;
    }),

  toggleFilters: () =>
    set((state) => {
      state.isFiltersOpen = !state.isFiltersOpen;
    }),

  setActiveSidebarTab: (tab) =>
    set((state) => {
      state.activeSidebarTab = tab;
    }),

  setSplitPaneSizes: (sizes) =>
    set((state) => {
      state.splitPaneSizes = sizes;
    }),

  setHoveredConversation: (conversationId) =>
    set((state) => {
      state.hoveredConversationId = conversationId;
    }),

  setComposerDraft: (conversationId, draft) =>
    set((state) => {
      state.composerDrafts[conversationId] = draft;
    }),

  clearComposerDraft: (conversationId) =>
    set((state) => {
      delete state.composerDrafts[conversationId];
    }),

  setComposerReplyTarget: (conversationId, messageId) =>
    set((state) => {
      state.composerReplyTargets[conversationId] = messageId;
    }),

  clearComposerReplyTarget: (conversationId) =>
    set((state) => {
      delete state.composerReplyTargets[conversationId];
    }),

  setActiveQuickReply: (conversationId) =>
    set((state) => {
      state.activeQuickReplyId = conversationId;
    }),
});
