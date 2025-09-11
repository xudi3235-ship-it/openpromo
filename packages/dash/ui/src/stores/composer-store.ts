import type {
  AllPlacement,
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
  SharedAttachmentSpec,
} from "@core/domain/content/schema/placement";
import type { Platform } from "@core/schemas/connected-account.sql";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

interface Account {
  id: string;
  name: string;
  platform: Platform;
  avatar?: string;
}

interface ComposerState {
  placementSelected: AllPlacement | "ALL";
  placementSpecs: {
    base: {
      attachments: SharedAttachmentSpec[];
    };
    facebookFeed: FBFeedPlacementSpec;
    instagramFeed: IGFeedPlacementSpec;
  };
  selectedAccounts: string[];
  accounts: Account[];
}
interface ComposerActions {
  setPlacementSpecs: (specs: {
    facebookFeed?: FBFeedPlacementSpec;
    instagramFeed?: IGFeedPlacementSpec;
  }) => void;
  toggleAccount: (accountId: string) => void;
  toggleAllAccounts: () => void;
  setAccounts: (accounts: Account[]) => void;
  addAttachments: (files: File[]) => void;
  removeAttachment: (index: number) => void;
}

const mockAccounts: Account[] = [
  { id: "fb1", name: "@business_page", platform: "FACEBOOK" },
  { id: "ig1", name: "@brand_account", platform: "INSTAGRAM" },
  { id: "tt1", name: "@company_tiktok", platform: "TIKTOK" },
  { id: "ig2", name: "@personal_ig", platform: "INSTAGRAM" },
];

export const useComposerStore = create<ComposerState & ComposerActions>()(
  immer((set) => ({
    placementSelected: "ALL",
    placementSpecs: {
      base: {
        attachments: [],
      },
      facebookFeed: {} as FBFeedPlacementSpec,
      instagramFeed: {} as IGFeedPlacementSpec,
    },
    selectedAccounts: mockAccounts.map((account) => account.id),
    accounts: mockAccounts,
    setPlacementSpecs: (specs) =>
      set((state) => {
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
    setAccounts: (accounts) =>
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
  })),
);
