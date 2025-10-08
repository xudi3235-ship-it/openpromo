import {
  FBFeedValidationSpec,
  IGFeedValidationSpec,
  TikTokFeedValidationSpec,
} from "@shared/content";
import type { Draft } from "immer";
import type {
  ComposerState,
  ComposerStore,
  ValidationError,
  ValidationState,
} from "../types";

export const validateComposerState = (
  state: ComposerState,
): ValidationState => {
  const errors: ValidationError[] = [];

  // Account selection validation
  if (state.selectedAccounts.length === 0) {
    errors.push({
      type: "no_accounts",
      message: "Select at least one social media account to publish to",
      severity: "error",
      field: "accounts",
    });
  }

  // Base message validation
  if (!state.contentCreateData.base.message?.trim()) {
    errors.push({
      type: "no_message",
      message: "Add a message to your post",
      severity: "error",
      field: "message",
    });
  }

  // Upload status validation
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
    });
  }

  // Scheduling validation
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

  // File size validation
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

  // Platform-specific validation using Zod schemas
  // Validate Facebook Feed placements
  for (const placement of state.contentCreateData.placements.facebookFeed ||
    []) {
    const result = FBFeedValidationSpec.safeParse(placement);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({
          type: "platform_limit_exceeded",
          message: `Facebook: ${issue.message}`,
          severity: "error",
          field: "media",
        });
      }
    }
  }

  // Validate Instagram Feed placements
  for (const placement of state.contentCreateData.placements.instagramFeed ||
    []) {
    const result = IGFeedValidationSpec.safeParse(placement);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({
          type: "platform_limit_exceeded",
          message: `Instagram: ${issue.message}`,
          severity: "error",
          field: "media",
        });
      }
    }
  }

  // Validate TikTok Feed placements
  for (const placement of state.contentCreateData.placements.tiktokFeed || []) {
    const result = TikTokFeedValidationSpec.safeParse(placement);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({
          type: "platform_limit_exceeded",
          message: `TikTok: ${issue.message}`,
          severity: "error",
          field: "media",
        });
      }
    }
  }

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
