import type { ComposerState, ValidationError } from "../../types";
import { getSelectedComposerPlatforms } from "./shared";

export const validateUploads = (state: ComposerState): ValidationError[] => {
  const errors: ValidationError[] = [];

  const hasPendingUploads = state.contentCreateData.base.attachments?.some(
    (att) =>
      att.metadata &&
      typeof att.metadata === "object" &&
      "uploading" in att.metadata &&
      att.metadata.uploading === true,
  );

  if (hasPendingUploads) {
    errors.push({
      type: "upload_pending",
      message: "Wait for all media uploads to complete",
      severity: "error",
      field: "media",
      platforms: getSelectedComposerPlatforms(state),
    });
  }

  const hasFailedUploads = state.contentCreateData.base.attachments?.some(
    (att) =>
      att.metadata &&
      typeof att.metadata === "object" &&
      "error" in att.metadata &&
      att.metadata.error,
  );

  if (hasFailedUploads) {
    errors.push({
      type: "upload_failed",
      message: "Some media uploads failed. Remove failed uploads or try again",
      severity: "error",
      field: "media",
      platforms: getSelectedComposerPlatforms(state),
    });
  }

  return errors;
};
