import { create } from "zustand";

export interface DialogComposerState {
  isOpen: boolean;
  pendingContentGroupID?: string;
}

export interface DialogComposerActions {
  openDialog: (contentGroupID?: string) => void;
  closeDialog: () => void;
}

export type DialogComposerStore = DialogComposerState & DialogComposerActions;

export const useDialogComposerStore = create<DialogComposerStore>((set) => ({
  // State
  isOpen: false,
  pendingContentGroupID: undefined,

  // Actions
  openDialog: (contentGroupID) =>
    set({
      isOpen: true,
      pendingContentGroupID: contentGroupID,
    }),

  closeDialog: () =>
    set({
      isOpen: false,
      pendingContentGroupID: undefined,
    }),
}));
