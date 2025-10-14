import type { ComposerState, ValidationError } from "../../types";
import { resolveHasMediaOrLink } from "../caption";

export const validateMessage = (state: ComposerState): ValidationError[] => {
  const errors: ValidationError[] = [];

  const hasText = Boolean(state.contentCreateData.base.message?.trim());
  const mediaOrLink = resolveHasMediaOrLink(
    state.contentCreateData.base.attachments,
    state.contentCreateData.placements.facebookFeed,
  );

  if (!hasText && !mediaOrLink) {
    errors.push({
      type: "no_message",
      message: "Add text or attach media to publish.",
      severity: "error",
      field: "message",
    });
  }

  return errors;
};
