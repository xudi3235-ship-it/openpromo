import {
  FBFeedValidationSpec,
  IGFeedValidationSpec,
  TikTokFeedValidationSpec,
} from "@shared/content";
import type { ComposerState, ValidationError } from "../../types";

export const validatePlatforms = (state: ComposerState): ValidationError[] => {
  const errors: ValidationError[] = [];

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

  return errors;
};
