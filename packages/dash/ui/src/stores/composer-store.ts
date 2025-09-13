import type {
  AllPlacement,
  SharedAttachmentSpec,
} from "@core/domain/content/schema/placement";
import type { Platform } from "@core/schemas/connected-account.sql";
import type { ContentCreateData } from "@worker/routes/api/workspaces/content";
import { createContext, useContext } from "react";
import { createStore, useStore } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { ConnectedAccount } from "@/lib/hono-client";

export interface ComposerProps {
  initialAccounts?: ConnectedAccount[];
  initialPlacementSelected?: AllPlacement | "ALL";
  initialSelectedPreview?: Platform;
  initialMessage?: string;
}

export interface ComposerState {
  placementSelected: AllPlacement | "ALL";
  selectedPreview: Platform;
  accounts: ConnectedAccount[];
  contentCreateData: ContentCreateData;
}

export interface ComposerActions {
  setSelectedPreview: (platform: Platform) => void;
  setMessage: (message: string) => void;
  addAttachments: (files: File[]) => void;
  removeAttachment: (index: number) => void;
  updateAttachment: (
    index: number,
    updates: Partial<SharedAttachmentSpec>,
  ) => void;
  clearAttachments: () => void;
}

export type ComposerStore = ComposerState & ComposerActions;

export const createComposerStore = (initProps: Partial<ComposerProps>) => {
  const DEFAULT_PROPS: ComposerProps = {
    initialAccounts: [],
    initialPlacementSelected: "ALL",
    initialSelectedPreview: "FACEBOOK",
    initialMessage: "",
  };
  const props = { ...DEFAULT_PROPS, ...initProps } satisfies ComposerProps;

  return createStore<ComposerState & ComposerActions>()(
    immer((set) => ({
      // state
      placementSelected: props.initialPlacementSelected || "ALL",
      selectedPreview: props.initialSelectedPreview || "FACEBOOK",
      accounts: props.initialAccounts || [],
      contentCreateData: {
        base: {
          message: props.initialMessage || "",
          publishingStatus: "PUBLISH_NOW",
          attachments: [],
        },
        placements: {
          facebookFeed: [],
          instagramFeed: [],
        },
      },
      // actions
      setSelectedPreview: (platform) =>
        set((state) => {
          state.selectedPreview = platform;
        }),
      setMessage: (message) =>
        set((state) => {
          state.contentCreateData.base.message = message;
        }),
      addAttachments: (files) =>
        set((state) => {
          const newAttachments = files.map((file, index) => ({
            id: `temp-${Date.now()}-${Math.random().toString(36).substring(2)}-${index}`,
            type: file.type.startsWith("video/")
              ? ("video" as const)
              : ("photo" as const),
            file,
            mimeType: file.type,
            metadata: { uploading: true },
          }));
          state.contentCreateData.base.attachments.push(...newAttachments);
        }),
      removeAttachment: (index) =>
        set((state) => {
          state.contentCreateData.base.attachments.splice(index, 1);
        }),
      updateAttachment: (index, updates) =>
        set((state) => {
          const attachment = state.contentCreateData.base.attachments[index];
          if (attachment) {
            Object.assign(attachment, updates);
          }
        }),
      clearAttachments: () =>
        set((state) => {
          state.contentCreateData.base.attachments = [];
        }),
    })),
  );
};

export type ComposerStoreType = ReturnType<typeof createComposerStore>;

export const ComposerContext = createContext<ComposerStoreType | null>(null);
export function useComposerStore<T = ComposerState & ComposerActions>(
  selector?: (state: ComposerState & ComposerActions) => T,
): T {
  const store = useContext(ComposerContext);
  if (!store) throw new Error("Missing ComposerProvider in the tree");
  return useStore(store, selector || ((s) => s as T));
}
