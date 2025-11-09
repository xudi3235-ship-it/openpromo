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
import { buildPlacementRegistry } from "./composer/utils/placements";

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
        const currentState = get();

        // CASE 1: Explicit content data provided (e.g., editing a post, "create post" with image)
        // Always use the provided data and do a full reset
        if (initProps.initContentCreateData) {
          const newProps = resolveComposerProps(initProps);
          const newState = createComposerInitialState(newProps);
          set((state) => {
            Object.assign(state, newState);
          });
          return;
        }

        // CASE 2: State preservation mode
        // If there's existing content and no explicit reset request (no contentGroupID),
        // preserve the content and just update accounts (e.g., navigating to /composer after setting image)
        const hasExistingContent =
          (currentState.contentCreateData.base.attachments?.length ?? 0) > 0 ||
          (currentState.contentCreateData.base.message?.trim().length ?? 0) > 0;

        if (hasExistingContent && !initProps.contentGroupID) {
          const newAccounts =
            initProps.initialAccounts ?? currentState.accounts;

          // Update accounts and select all of them (default behavior for new posts)
          set((state) => {
            state.accounts = newAccounts;
            state.selectedAccounts = newAccounts.map((acc) => acc.id);
            // Rebuild placement registry with new accounts
            state.placementsByAccount = buildPlacementRegistry(
              newAccounts,
              state.contentCreateData.placements,
            );
          });
          return;
        }

        // CASE 3: Full reset (e.g., opening fresh composer, explicit contentGroupID without data)
        const newProps = resolveComposerProps(initProps);
        const newState = createComposerInitialState(newProps);
        set((state) => {
          Object.assign(state, newState);
        });
      },

      // Add method to reset composer to clean state
      resetComposer: () => {
        const accounts = get().accounts;
        const newProps = resolveComposerProps({ initialAccounts: accounts });
        const newState = createComposerInitialState(newProps);
        set((state) => {
          Object.assign(state, newState);
        });
      },
    };
  }),
);
