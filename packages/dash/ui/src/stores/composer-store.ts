import type {
  AllPlacement,
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
  SharedAttachmentSpec,
} from "@core/domain/content/schema/placement";
import type { Platform } from "@core/schemas/connected-account.sql";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { ConnectedAccount } from "@/lib/hono-client";

interface ComposerState {
  placementSelected: AllPlacement | "ALL";
  placementSpecs: {
    base: {
      attachments: SharedAttachmentSpec[];
      message: string;
    };
    facebookFeed: FBFeedPlacementSpec;
    instagramFeed: IGFeedPlacementSpec;
  };
  selectedAccounts: string[];
  accounts: ConnectedAccount[];
  selectedPreview: Platform;
}
interface ComposerActions {
  setPlacementSpecs: (specs: {
    base?: {
      attachments?: SharedAttachmentSpec[];
      message?: string;
    };
    facebookFeed?: FBFeedPlacementSpec;
    instagramFeed?: IGFeedPlacementSpec;
  }) => void;
  toggleAccount: (accountId: string) => void;
  toggleAllAccounts: () => void;
  setAccounts: (accounts: ConnectedAccount[]) => void;
  addAttachments: (files: File[]) => void;
  removeAttachment: (index: number) => void;
  setSelectedPreview: (preview: Platform) => void;
}

export const useComposerStore = create<ComposerState & ComposerActions>()(
  immer((set) => ({
    placementSelected: "ALL",
    placementSpecs: {
      base: {
        attachments: [],
        message: "",
      },
      facebookFeed: {} as FBFeedPlacementSpec,
      instagramFeed: {} as IGFeedPlacementSpec,
    },
    selectedAccounts: [],
    accounts: [],
    selectedPreview: "FACEBOOK",
    setPlacementSpecs: (specs) =>
      set((state) => {
        if (specs.base) {
          if (specs.base.attachments !== undefined) {
            state.placementSpecs.base.attachments = specs.base.attachments;
          }
          if (specs.base.message !== undefined) {
            state.placementSpecs.base.message = specs.base.message;
          }
        }
        if (specs.facebookFeed) {
          state.placementSpecs.facebookFeed = specs.facebookFeed;
        }
        if (specs.instagramFeed) {
          state.placementSpecs.instagramFeed = specs.instagramFeed;
        }
      }),
    toggleAccount: (accountId) =>
      set((state) => {
        if (state.selectedAccounts.includes(accountId)) {
          state.selectedAccounts = state.selectedAccounts.filter(
            (id) => id !== accountId,
          );
        } else {
          state.selectedAccounts.push(accountId);
        }
      }),
    toggleAllAccounts: () =>
      set((state) => {
        if (state.selectedAccounts.length === state.accounts.length) {
          state.selectedAccounts = [];
        } else {
          state.selectedAccounts = state.accounts.map((account) => account.id);
        }
      }),
    setAccounts: (accounts: ConnectedAccount[]) =>
      set((state) => {
        state.accounts = accounts;
        state.selectedAccounts = accounts.map((account) => account.id);
      }),
    addAttachments: (files: File[]) =>
      set((state) => {
        const newAttachments = files.map((file, index) => ({
          id: `attachment-${Date.now()}-${index}`,
          type: file.type.startsWith("image/")
            ? ("photo" as const)
            : ("video" as const),
          file,
          mimeType: file.type,
        }));
        state.placementSpecs.base.attachments.push(...newAttachments);
      }),
    removeAttachment: (index: number) =>
      set((state) => {
        state.placementSpecs.base.attachments =
          state.placementSpecs.base.attachments.filter((_, i) => i !== index);
      }),
    setSelectedPreview: (preview: Platform) =>
      set((state) => {
        state.selectedPreview = preview;
      }),
  })),
);
