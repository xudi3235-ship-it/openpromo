import type {
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
} from "@core/domain/content/schema/placement";
import type {
  FBPageMetadata,
  IGAccountMetadata,
} from "@core/schemas/connected-account.sql";
import type { ContentCreateData } from "@worker/routes/api/workspaces/content";
import { createContext, useContext } from "react";
import { createStore, useStore } from "zustand";
import { immer } from "zustand/middleware/immer";
import { createAccountActions } from "./actions/accountActions";
import { createAttachmentActions } from "./actions/attachmentActions";
import { createMessageActions } from "./actions/messageActions";
import { createPlacementActions } from "./actions/placementActions";
import { createUIActions } from "./actions/uiActions";
import type { ComposerActions, ComposerProps, ComposerState } from "./types";

// factory
export const createComposerStore = (initProps?: Partial<ComposerProps>) => {
  const DEFAULT_PROPS: ComposerProps = {
    initialAccounts: [],
    initialPlacementSelected: "ALL",
    initialSelectedPreview: "FACEBOOK",
    initialMessage: "",
  };
  const props = { ...DEFAULT_PROPS, ...initProps };

  const facebookFeed = props.initialAccounts
    ?.filter((a) => a.platform === "FACEBOOK")
    .map(
      (acc) =>
        ({
          identity: {
            connectedAccountID: acc.id,
            fbPageID: (acc.metadata as FBPageMetadata).pageID,
          },
          placement: "FB_FEED",
          postSpec: { message: props.initialMessage || "" },
        }) as FBFeedPlacementSpec,
    );

  const instagramFeed = props.initialAccounts
    ?.filter((a) => a.platform === "INSTAGRAM")
    .map(
      (acc) =>
        ({
          identity: {
            connectedAccountID: acc.id,
            igAccountID: (acc.metadata as IGAccountMetadata).igAccountID,
          },
          placement: "IG_FEED",
        }) as IGFeedPlacementSpec,
    );

  return createStore<ComposerState & ComposerActions>()(
    immer((set, get, api) => ({
      // state
      placementSelected: props.initialPlacementSelected || "ALL",
      contentCreateData: {
        base: {
          publishingStatus: "PUBLISH_NOW",
          attachments: [],
          message: props.initialMessage || "",
        },
        placements: { facebookFeed, instagramFeed },
      } as ContentCreateData,
      selectedPreview: props.initialSelectedPreview || "FACEBOOK",
      accountsMap: new Map(props.initialAccounts?.map((a) => [a.id, a]) || []),

      // derived
      get accounts() {
        return Array.from(this.accountsMap.values());
      },
      get selectedAccounts() {
        const fb =
          this.contentCreateData.placements.facebookFeed?.map(
            (s) => s.identity.connectedAccountID,
          ) || [];
        const ig =
          this.contentCreateData.placements.instagramFeed?.map(
            (s) => s.identity.connectedAccountID,
          ) || [];
        return [...fb, ...ig];
      },

      // internal getters
      _getAccounts: () => Array.from(get().accountsMap.values()),
      _getSelectedAccounts: () => {
        const state = get();
        const fb =
          state.contentCreateData.placements.facebookFeed?.map(
            (s) => s.identity.connectedAccountID,
          ) || [];
        const ig =
          state.contentCreateData.placements.instagramFeed?.map(
            (s) => s.identity.connectedAccountID,
          ) || [];
        return [...fb, ...ig];
      },
      // actions placeholders (merged below)
      ...createPlacementActions(set, get, api),
      ...createMessageActions(set, get, api),
      ...createAccountActions(set, get, api),
      ...createAttachmentActions(set, get, api),
      ...createUIActions(set, get, api),
    })),
  );
};

export const ComposerContext = createContext<ReturnType<
  typeof createComposerStore
> | null>(null);

export function useComposerStore<T = ComposerState & ComposerActions>(
  selector?: (state: ComposerState & ComposerActions) => T,
): T {
  const store = useContext(ComposerContext);
  if (!store) throw new Error("Missing ComposerProvider in the tree");
  return useStore(store, selector || ((s) => s as T));
}

export type { ComposerActions, ComposerProps, ComposerState } from "./types";
