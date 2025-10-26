import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  createComposerInitialState,
  resolveComposerProps,
} from "./composer/initial-state";
import { createAccountsSlice } from "./composer/slices/accounts-slice";
import { createAttachmentsSlice } from "./composer/slices/attachments-slice";
import { createMessageSlice } from "./composer/slices/message-slice";
import { createPlatformFeaturesSlice } from "./composer/slices/platform-features-slice";
import { createPublishingSlice } from "./composer/slices/publishing-slice";
import { createSelectionSlice } from "./composer/slices/selection-slice";
import { createVideoThumbnailSlice } from "./composer/slices/video-thumbnail-slice";
import type { ComposerProps, ComposerStore } from "./composer/types";

export type {
  ComposerActions,
  ComposerProps,
  ComposerState,
  ComposerStore,
  ValidationError,
  ValidationState,
} from "./composer/types";

/**
 * Global composer store instance.
 *
 * Since we only ever have one composer active at a time across the workspace,
 * we use a single global Zustand store instead of Context-based isolated stores.
 *
 * To initialize the composer with specific data, call `initializeComposer()`
 * from the store actions.
 */
export const useComposerStore = create<ComposerStore>()(
  immer((set, get) => {
    const props = resolveComposerProps({});
    const initialState = createComposerInitialState(props);

    return {
      ...initialState,
      ...createSelectionSlice(set, get),
      ...createAccountsSlice(set, get),
      ...createMessageSlice(set, get),
      ...createAttachmentsSlice(set, get),
      ...createPublishingSlice(set, get),
      ...createPlatformFeaturesSlice(set, get),
      ...createVideoThumbnailSlice(set, get),

      // Add method to reinitialize composer with new props
      initializeComposer: (initProps: Partial<ComposerProps>) => {
        const newProps = resolveComposerProps(initProps);
        const newState = createComposerInitialState(newProps);
        set((state) => {
          Object.assign(state, newState);
        });
      },
    };
  }),
);
