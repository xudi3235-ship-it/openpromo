import type { ContentCreateData } from "@worker/routes/api/workspaces/content";
import { create } from "zustand";

export interface DialogComposerState {
  isOpen: boolean;
  pendingContentGroupID?: string;
  initialContentCreateData?: ContentCreateData | null;
}

export interface DialogComposerActions {
  openDialog: (
    contentGroupID?: string,
    options?: { contentCreateData?: ContentCreateData | null },
  ) => void;
  closeDialog: () => void;
}

export type DialogComposerStore = DialogComposerState & DialogComposerActions;

export const useDialogComposerStore = create<DialogComposerStore>((set) => ({
  // State
  isOpen: false,
  pendingContentGroupID: undefined,
  initialContentCreateData: null,

  // Actions
  openDialog: (contentGroupID, options) =>
    set({
      isOpen: true,
      pendingContentGroupID: contentGroupID,
      initialContentCreateData: options?.contentCreateData ?? null,
    }),

  closeDialog: () =>
    set({
      isOpen: false,
      pendingContentGroupID: undefined,
      initialContentCreateData: null,
    }),
}));
