import type { AllPlacement } from "@core/domain/content/schema/placement";
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
  accountsMap: Map<string, ConnectedAccount>;
  accounts: ConnectedAccount[];
  selectedAccounts: string[];
  contentCreateData: ContentCreateData;
}

export interface ComposerActions {
  setSelectedPreview: (platform: Platform) => void;
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
    immer((set, get) => ({
      // state
      placementSelected: props.initialPlacementSelected || "ALL",
      selectedPreview: props.initialSelectedPreview || "FACEBOOK",
      accountsMap: new Map(props.initialAccounts?.map((a) => [a.id, a]) || []),
      accounts: Array.from(get().accountsMap.values()),
      selectedAccounts: props.initialAccounts?.map((a) => a.id) || [],
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
    })),
  );
};

type ComposerStoreType = ReturnType<typeof createComposerStore>;

export const ComposerContext = createContext<ComposerStoreType | null>(null);
export function useComposerStore<T = ComposerState & ComposerActions>(
  selector?: (state: ComposerState & ComposerActions) => T,
): T {
  const store = useContext(ComposerContext);
  if (!store) throw new Error("Missing ComposerProvider in the tree");
  return useStore(store, selector || ((s) => s as T));
}
