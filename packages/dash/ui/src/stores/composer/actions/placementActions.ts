import type {
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
  SharedAttachmentSpec,
} from "@core/domain/content/schema/placement";
import type { StateCreator } from "zustand";
import type { ComposerActions, ComposerState } from "../types";

export const createPlacementActions: StateCreator<
  ComposerState & ComposerActions,
  [["zustand/immer", never]],
  [],
  Pick<ComposerActions, "setPlacementSpecs">
> = (set) => ({
  setPlacementSpecs: (specs) =>
    set((state) => {
      if (specs.base?.message !== undefined)
        state.contentCreateData.base.message = specs.base.message;
      if (specs.base?.attachments !== undefined)
        state.contentCreateData.base.attachments = specs.base
          .attachments as SharedAttachmentSpec[];
      if (specs.facebookFeed)
        state.contentCreateData.placements.facebookFeed =
          specs.facebookFeed as FBFeedPlacementSpec[];
      if (specs.instagramFeed)
        state.contentCreateData.placements.instagramFeed =
          specs.instagramFeed as IGFeedPlacementSpec[];
    }),
});
