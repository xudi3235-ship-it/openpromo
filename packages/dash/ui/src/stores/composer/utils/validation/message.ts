import type { ComposerState, ValidationError } from "../../types";

export const validateMessage = (state: ComposerState): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!state.contentCreateData.base.message?.trim()) {
    errors.push({
      type: "no_message",
      message: "Add a message to your post",
      severity: "error",
      field: "message",
    });
  }

  return errors;
};
