import type { Draft } from "immer";
import type {
  ComposerState,
  ComposerStore,
  ValidationState,
} from "../../types";
import { validateAccounts } from "./accounts";
import { validateFileSize } from "./file-size";
import { validateMessage } from "./message";
import { validatePlatforms } from "./platforms";
import { validateScheduling } from "./scheduling";
import { validateUploads } from "./uploads";

export const validateComposerState = (
  state: ComposerState,
): ValidationState => {
  const errors = [
    ...validateAccounts(state),
    ...validateMessage(state),
    ...validateUploads(state),
    ...validateScheduling(state),
    ...validateFileSize(state),
    ...validatePlatforms(state),
  ];

  const hasErrors = errors.some((error) => error.severity === "error");

  return {
    isValid: errors.length === 0,
    errors,
    canPublish: !hasErrors,
  };
};

export const recalculateValidation = (state: Draft<ComposerStore>) => {
  state.validation = validateComposerState(state as ComposerState);
};
