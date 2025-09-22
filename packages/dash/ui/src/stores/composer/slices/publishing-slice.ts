import type { ContentCreateData } from "@worker/routes/api/workspaces/content";
import { recalculateValidation } from "../utils/validation";
import type { ComposerSlice } from "./types";

export const createPublishingSlice: ComposerSlice<{
  setPublishingStatus: (
    status: ContentCreateData["base"]["publishingStatus"],
    schedulingSpec?: ContentCreateData["base"]["schedulingSpec"],
  ) => void;
  setSchedulingSpec: (
    schedulingSpec?: ContentCreateData["base"]["schedulingSpec"],
  ) => void;
}> = (set) => ({
  setPublishingStatus: (status, schedulingSpec) =>
    set((state) => {
      state.contentCreateData.base.publishingStatus = status;
      if (schedulingSpec !== undefined) {
        state.contentCreateData.base.schedulingSpec = schedulingSpec;
      } else if (
        status === "SCHEDULED" &&
        !state.contentCreateData.base.schedulingSpec
      ) {
        const defaultDate = new Date();
        defaultDate.setMinutes(defaultDate.getMinutes() + 20);
        state.contentCreateData.base.schedulingSpec = {
          publishAt: defaultDate,
        };
      }

      recalculateValidation(state);
    }),
  setSchedulingSpec: (schedulingSpec) =>
    set((state) => {
      state.contentCreateData.base.schedulingSpec = schedulingSpec;
      recalculateValidation(state);
    }),
});
