import type { ComposerState, ValidationError } from "@/stores/composer/types";
import { getCaptionValidation } from "../caption";

const formatLimit = (limit: number) =>
  limit.toLocaleString(undefined, { maximumFractionDigits: 0 });

export const validateMessageLength = (
  state: ComposerState,
): ValidationError[] => {
  const message = state.contentCreateData.base.message ?? "";
  const validation = getCaptionValidation(state, message);
  const errors: ValidationError[] = [];

  if (validation.needsMediaForIG) {
    errors.push({
      type: "instagram_requires_media",
      message: "Instagram requires at least one image or video.",
      severity: "error",
      field: "message",
    });
  }

  if (validation.overLimit) {
    errors.push({
      type: "message_too_long",
      message:
        "Caption exceeds the limit for one or more platforms. Trim the text or remove a destination.",
      severity: "error",
      field: "message",
    });
  } else if (
    validation.state === "warn" &&
    !validation.needsMediaForIG &&
    !validation.emptyAll &&
    validation.len > 0
  ) {
    errors.push({
      type: "message_length_warning",
      message: `Approaching the ${formatLimit(validation.limit)} character limit.`,
      severity: "warning",
      field: "message",
    });
  }

  return errors;
};
