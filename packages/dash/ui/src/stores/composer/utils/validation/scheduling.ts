import type { ComposerState, ValidationError } from "../../types";

export const validateScheduling = (state: ComposerState): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (state.contentCreateData.base.publishingStatus === "SCHEDULED") {
    const publishAt = state.contentCreateData.base.schedulingSpec?.publishAt;
    if (!publishAt || new Date(publishAt) <= new Date()) {
      errors.push({
        type: "invalid_scheduling",
        message: "Scheduled time must be in the future",
        severity: "error",
        field: "scheduling",
      });
    }
  }

  return errors;
};
