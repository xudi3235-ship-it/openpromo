import type {
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
  TikTokFeedPlacementSpec,
} from "@shared/content";
import type { ContentCreateData } from "@worker/routes/api/workspaces/content";
import type { Draft } from "immer";
import type { ComposerStore } from "../types";
import { rebuildPlacementsFromRegistry } from "../utils/placements";
import { createSnapshot, hasSnapshotChanged } from "../utils/snapshot";
import { recalculateValidation } from "../utils/validation";
import type { ComposerSlice } from "./types";

const normalizeSchedulingSpec = (
  schedulingSpec?: ContentCreateData["base"]["schedulingSpec"],
) => {
  if (!schedulingSpec?.publishAt) return undefined;
  return {
    ...schedulingSpec,
    publishAt: new Date(schedulingSpec.publishAt),
  } as ContentCreateData["base"]["schedulingSpec"];
};

const applySchedulingToPlacements = (
  state: Draft<ComposerStore>,
  nextSchedulingSpec?: ContentCreateData["base"]["schedulingSpec"],
  previousSchedulingSpec?: ContentCreateData["base"]["schedulingSpec"],
) => {
  const normalizedNext = normalizeSchedulingSpec(nextSchedulingSpec);
  const normalizedPrev = normalizeSchedulingSpec(previousSchedulingSpec);

  const prevTime = normalizedPrev?.publishAt
    ? normalizedPrev.publishAt.getTime()
    : undefined;

  if (!state.placementsByAccount) {
    state.placementsByAccount = {};
  }

  Object.values(state.placementsByAccount).forEach((entry) => {
    const spec = entry.spec as
      | FBFeedPlacementSpec
      | IGFeedPlacementSpec
      | TikTokFeedPlacementSpec;

    if (!normalizedNext) {
      if (spec.schedulingSpec) {
        delete spec.schedulingSpec;
      }
      return;
    }

    const currentTime = spec.schedulingSpec?.publishAt
      ? new Date(spec.schedulingSpec.publishAt).getTime()
      : undefined;

    const hasCustomSchedule =
      currentTime !== undefined &&
      prevTime !== undefined &&
      currentTime !== prevTime;

    if (!hasCustomSchedule) {
      spec.schedulingSpec = { ...normalizedNext };
    }
  });

  rebuildPlacementsFromRegistry(state);
};

export const createPublishingSlice: ComposerSlice<{
  setPublishingStatus: (
    status: ContentCreateData["base"]["publishingStatus"],
    schedulingSpec?: ContentCreateData["base"]["schedulingSpec"],
  ) => void;
  setSchedulingSpec: (
    schedulingSpec?: ContentCreateData["base"]["schedulingSpec"],
  ) => void;
  hasUnsavedChanges: () => boolean;
}> = (set, get) => ({
  setPublishingStatus: (status, schedulingSpec) =>
    set((state) => {
      const previousSchedulingSpec =
        state.contentCreateData.base.schedulingSpec;
      state.contentCreateData.base.publishingStatus = status;
      if (schedulingSpec !== undefined) {
        const normalized = normalizeSchedulingSpec(schedulingSpec);
        state.contentCreateData.base.schedulingSpec = normalized;
        applySchedulingToPlacements(state, normalized, previousSchedulingSpec);
      } else if (
        status === "SCHEDULED" &&
        !state.contentCreateData.base.schedulingSpec
      ) {
        const defaultDate = new Date();
        defaultDate.setMinutes(defaultDate.getMinutes() + 20);
        const normalized = {
          publishAt: defaultDate,
        };
        state.contentCreateData.base.schedulingSpec = normalized;
        applySchedulingToPlacements(state, normalized, previousSchedulingSpec);
      } else if (status === "SCHEDULED") {
        const normalized = normalizeSchedulingSpec(
          state.contentCreateData.base.schedulingSpec,
        );
        state.contentCreateData.base.schedulingSpec = normalized;
        applySchedulingToPlacements(state, normalized, previousSchedulingSpec);
      } else {
        state.contentCreateData.base.schedulingSpec = undefined;
        applySchedulingToPlacements(state, undefined, previousSchedulingSpec);
      }

      recalculateValidation(state);
    }),
  setSchedulingSpec: (schedulingSpec) =>
    set((state) => {
      const previousSchedulingSpec =
        state.contentCreateData.base.schedulingSpec;
      const normalized = normalizeSchedulingSpec(schedulingSpec);
      state.contentCreateData.base.schedulingSpec = normalized;
      applySchedulingToPlacements(state, normalized, previousSchedulingSpec);
      recalculateValidation(state);
    }),
  hasUnsavedChanges: () => {
    const state = get();
    const { initialSnapshot, contentCreateData, selectedAccounts } = state;

    // Create a snapshot of the current state and compare with initial
    const currentSnapshot = createSnapshot(contentCreateData, selectedAccounts);
    return hasSnapshotChanged(initialSnapshot, currentSnapshot);
  },
});
