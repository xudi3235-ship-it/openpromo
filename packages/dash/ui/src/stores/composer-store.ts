import type {
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
} from "@core/domain/content/schema/placement";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

interface ComposerState {
  placementSpecs: {
    facebookFeed: FBFeedPlacementSpec;
    instagramFeed: IGFeedPlacementSpec;
  };
}
interface ComposerActions {
  setPlacementSpecs: (specs: {
    facebookFeed?: FBFeedPlacementSpec;
    instagramFeed?: IGFeedPlacementSpec;
  }) => void;
}

export const useComposerStore = create<ComposerState & ComposerActions>()(
  immer((set) => ({
    placementSpecs: {
      facebookFeed: {} as FBFeedPlacementSpec,
      instagramFeed: {} as IGFeedPlacementSpec,
    },
    setPlacementSpecs: (specs) =>
      set((state) => {
        if (specs.facebookFeed) {
          state.placementSpecs.facebookFeed = specs.facebookFeed;
        }
        if (specs.instagramFeed) {
          state.placementSpecs.instagramFeed = specs.instagramFeed;
        }
      }),
  })),
);
