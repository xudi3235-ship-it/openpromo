import type { ComposerState, ValidationError } from "../../types";

export const validateAccounts = (state: ComposerState): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (state.selectedAccounts.length === 0) {
    errors.push({
      type: "no_accounts",
      message: "Select at least one social media account to publish to",
      severity: "error",
      field: "accounts",
    });
  }

  return errors;
};
