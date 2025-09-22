import { createContext, useContext } from "react";
import { createStore, useStore } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  createComposerInitialState,
  resolveComposerProps,
} from "./composer/initial-state";
import { createAccountsSlice } from "./composer/slices/accounts-slice";
import { createAttachmentsSlice } from "./composer/slices/attachments-slice";
import { createMessageSlice } from "./composer/slices/message-slice";
import { createPublishingSlice } from "./composer/slices/publishing-slice";
import { createSelectionSlice } from "./composer/slices/selection-slice";
import type { ComposerProps, ComposerStore } from "./composer/types";

export type {
  ComposerActions,
  ComposerProps,
  ComposerState,
  ComposerStore,
  ValidationError,
  ValidationState,
} from "./composer/types";

export const createComposerStore = (initProps: Partial<ComposerProps>) => {
  const props = resolveComposerProps(initProps);
  const initialState = createComposerInitialState(props);

  return createStore<ComposerStore>()(
    immer((set, get) => ({
      ...initialState,
      ...createSelectionSlice(set, get),
      ...createAccountsSlice(set, get),
      ...createMessageSlice(set, get),
      ...createAttachmentsSlice(set, get),
      ...createPublishingSlice(set, get),
    })),
  );
};

export type ComposerStoreType = ReturnType<typeof createComposerStore>;

export const ComposerContext = createContext<ComposerStoreType | null>(null);
export function useComposerStore<T = ComposerStore>(
  selector?: (state: ComposerStore) => T,
): T {
  const store = useContext(ComposerContext);
  if (!store) throw new Error("Missing ComposerProvider in the tree");
  return useStore(store, selector || ((s) => s as T));
}
