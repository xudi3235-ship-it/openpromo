import type { ContentCreateData } from "@worker/routes/api/workspaces/content";
import { createContext, useContext } from "react";
import { createStore, useStore } from "zustand";
import { immer } from "zustand/middleware/immer";
import { createAccountActions } from "./actions/accountActions";
import { createAttachmentActions } from "./actions/attachmentActions";
import { createMessageActions } from "./actions/messageActions";
import { createPlacementActions } from "./actions/placementActions";
import { createUIActions } from "./actions/uiActions";
import { buildContentFromDraft, createInitialDraft } from "./domain/draft";
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

  const draft = createInitialDraft(props.initialMessage || "");
  draft.selectedAccountIds = props.initialAccounts?.map((a) => a.id) || [];

  return createStore<ComposerState & ComposerActions>()(
    immer((set, get, api) => ({
      // state
      placementSelected: props.initialPlacementSelected || "ALL",
      draft,
      draftVersion: 0,
      _cachedContentVersion: -1,
      _cachedContentCreateData: undefined,
      selectedPreview: props.initialSelectedPreview || "FACEBOOK",
      accountsMap: new Map(props.initialAccounts?.map((a) => [a.id, a]) || []),

      // derived
      get accounts() {
        return Array.from(this.accountsMap.values());
      },
      get selectedAccounts() {
        return this.draft.selectedAccountIds;
      },
      get contentCreateDataDerived() {
        // Memoize derived content based on draftVersion
        if (this._cachedContentVersion !== this.draftVersion) {
          this._cachedContentCreateData = buildContentFromDraft(
            this.draft,
            this.accountsMap,
          ) as ContentCreateData;
          this._cachedContentVersion = this.draftVersion;
        }
        return this._cachedContentCreateData as ContentCreateData;
      },

      // internal getters
      _getAccounts: () => Array.from(get().accountsMap.values()),
      _getSelectedAccounts: () => {
        return get().draft.selectedAccountIds.slice();
      },
      // no _rebuildContent needed anymore; draftVersion drives memo invalidation
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

export { finalizeDraft } from "./domain/draft";
export type { ComposerActions, ComposerProps, ComposerState } from "./types";
