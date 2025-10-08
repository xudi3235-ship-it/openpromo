import type { ComposerState, ValidationError } from "../../types";

export const validateFileSize = (state: ComposerState): ValidationError[] => {
  const errors: ValidationError[] = [];

  const hasOversizedFiles = state.contentCreateData.base.attachments?.some(
    (att) => {
      if (!att.file) return false;
      const maxSize = att.file.type.startsWith("video/")
        ? 100 * 1024 * 1024
        : 10 * 1024 * 1024;
      return att.file.size > maxSize;
    },
  );

  if (hasOversizedFiles) {
    errors.push({
      type: "platform_limit_exceeded",
      message: "File size too large. Max 100MB for videos, 10MB for images",
      severity: "error",
      field: "media",
    });
  }

  return errors;
};
