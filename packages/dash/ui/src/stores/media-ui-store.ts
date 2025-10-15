import type { SharedAttachmentSpec } from "@shared/content";
import { create } from "zustand";

interface MediaUIState {
  // View mode
  viewMode: "compact" | "list";
  setViewMode: (mode: "compact" | "list") => void;

  // Selected media for preview
  selectedMedia: { attachment: SharedAttachmentSpec; index: number } | null;
  setSelectedMedia: (
    media: { attachment: SharedAttachmentSpec; index: number } | null,
  ) => void;

  // Editing media
  editingMedia: { attachment: SharedAttachmentSpec; index: number } | null;
  setEditingMedia: (
    media: { attachment: SharedAttachmentSpec; index: number } | null,
  ) => void;

  // Drag overlay
  dragOverlay: { attachment: SharedAttachmentSpec; index: number } | null;
  setDragOverlay: (
    overlay: { attachment: SharedAttachmentSpec; index: number } | null,
  ) => void;

  // Product AI modal
  productModalOpen: boolean;
  setProductModalOpen: (open: boolean) => void;

  // Reset all state
  reset: () => void;
}

const initialState = {
  viewMode: "compact" as const,
  selectedMedia: null,
  editingMedia: null,
  dragOverlay: null,
  productModalOpen: false,
};

export const useMediaUIStore = create<MediaUIState>((set) => ({
  ...initialState,

  setViewMode: (mode) => set({ viewMode: mode }),

  setSelectedMedia: (media) => set({ selectedMedia: media }),

  setEditingMedia: (media) => set({ editingMedia: media }),

  setDragOverlay: (overlay) => set({ dragOverlay: overlay }),

  setProductModalOpen: (open) => set({ productModalOpen: open }),

  reset: () => set(initialState),
}));
