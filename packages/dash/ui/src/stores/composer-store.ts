import type {
  AllPlacement,
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
  SharedAttachmentSpec,
} from "@core/domain/content/schema/placement";
import type { Platform } from "@core/schemas/connected-account.sql";
import { createContext, useContext } from "react";
import { createStore, useStore } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { ConnectedAccount } from "@/lib/hono-client";
import type { ContentCreateData } from "../../../worker/src/routes/api/workspaces/content/index";

// Props for initializing the composer store
export interface ComposerProps {
  initialAccounts?: ConnectedAccount[];
  initialPlacementSelected?: AllPlacement | "ALL";
  initialSelectedPreview?: Platform;
  initialMessage?: string;
}

interface ComposerState {
  placementSelected: AllPlacement | "ALL";
  contentCreateData: ContentCreateData;
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
    facebookFeed?: FBFeedPlacementSpec[];
    instagramFeed?: IGFeedPlacementSpec[];
  }) => void;
  toggleAccount: (accountId: string) => void;
  toggleAllAccounts: () => void;
  setAccounts: (accounts: ConnectedAccount[]) => void;
  addAttachments: (files: File[]) => void;
  removeAttachment: (index: number) => void;
  setSelectedPreview: (preview: Platform) => void;
}

export type ComposerStore = ReturnType<typeof createComposerStore>;

export const createComposerStore = (initProps?: Partial<ComposerProps>) => {
  const DEFAULT_PROPS: ComposerProps = {
    initialAccounts: [],
    initialPlacementSelected: "ALL",
    initialSelectedPreview: "FACEBOOK",
    initialMessage: "",
  };

  const props = { ...DEFAULT_PROPS, ...initProps };

  return createStore<ComposerState & ComposerActions>()(
    immer((set) => ({
      placementSelected: props.initialPlacementSelected || "ALL",
      contentCreateData: {
        base: {
          publishingStatus: "PUBLISH_NOW",
          attachments: [],
          message: props.initialMessage || "",
        },
        placements: {
          facebookFeed: [],
          instagramFeed: [],
        },
      },
      selectedAccounts:
        props.initialAccounts?.map((account) => account.id) || [],
      accounts: props.initialAccounts || [],
      selectedPreview: props.initialSelectedPreview || "FACEBOOK",
      setPlacementSpecs: (specs) =>
        set((state) => {
          if (specs.base) {
            if (specs.base.message !== undefined) {
              state.contentCreateData.base.message = specs.base.message;
            }
          }
          if (specs.facebookFeed) {
            state.contentCreateData.placements.facebookFeed =
              specs.facebookFeed;
          }
          if (specs.instagramFeed) {
            state.contentCreateData.placements.instagramFeed =
              specs.instagramFeed;
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
            state.selectedAccounts = state.accounts.map(
              (account) => account.id,
            );
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
          state.contentCreateData.base.attachments.push(...newAttachments);
        }),
      removeAttachment: (index: number) =>
        set((state) => {
          state.contentCreateData.base.attachments =
            state.contentCreateData.base.attachments.filter(
              (_, i) => i !== index,
            );
        }),
      setSelectedPreview: (preview: Platform) =>
        set((state) => {
          state.selectedPreview = preview;
        }),
    })),
  );
};

// Create context
export const ComposerContext = createContext<ComposerStore | null>(null);

// Custom hook to mimic the hook returned by `create`
export function useComposerStore<T = ComposerState & ComposerActions>(
  selector?: (state: ComposerState & ComposerActions) => T,
): T {
  const store = useContext(ComposerContext);
  if (!store) throw new Error("Missing ComposerProvider in the tree");

  return useStore(store, selector || ((state) => state as T));
}
