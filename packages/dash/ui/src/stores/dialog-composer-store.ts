import type { ContentCreateData } from "@worker/routes/api/workspaces/content";
import { create } from "zustand";

export type ComposerMode = "dialog" | "fullscreen" | "closed";

export interface DialogComposerState {
  mode: ComposerMode;
  pendingContentGroupID?: string;
  initialContentCreateData?: ContentCreateData | null;
}

export interface DialogComposerActions {
  openDialog: (
    contentGroupID?: string,
    options?: { contentCreateData?: ContentCreateData | null },
  ) => void;
  openFullscreen: (
    contentGroupID?: string,
    options?: { contentCreateData?: ContentCreateData | null },
  ) => void;
  switchToFullscreen: () => void;
  switchToDialog: () => void;
  closeComposer: () => void;
}

export type DialogComposerStore = DialogComposerState & DialogComposerActions;

export const useDialogComposerStore = create<DialogComposerStore>((set) => ({
  // State
  mode: "closed",
  pendingContentGroupID: undefined,
  initialContentCreateData: null,

  // Actions
  openDialog: (contentGroupID, options) =>
    set({
      mode: "dialog",
      pendingContentGroupID: contentGroupID,
      initialContentCreateData: options?.contentCreateData ?? null,
    }),

  openFullscreen: (contentGroupID, options) =>
    set({
      mode: "fullscreen",
      pendingContentGroupID: contentGroupID,
      initialContentCreateData: options?.contentCreateData ?? null,
    }),

  switchToFullscreen: () =>
    set((state) => ({
      mode: "fullscreen",
      // Preserve existing content
      pendingContentGroupID: state.pendingContentGroupID,
      initialContentCreateData: state.initialContentCreateData,
    })),

  switchToDialog: () =>
    set((state) => ({
      mode: "dialog",
      // Preserve existing content
      pendingContentGroupID: state.pendingContentGroupID,
      initialContentCreateData: state.initialContentCreateData,
    })),

  closeComposer: () =>
    set({
      mode: "closed",
      pendingContentGroupID: undefined,
      initialContentCreateData: null,
    }),
}));

// Helper function to check if composer is in dialog mode
export const isDialogMode = (mode: ComposerMode) => mode === "dialog";
