import type { ComposerState, ValidationError } from "../../types";
import { resolveHasMediaOrLink } from "../caption";
import {
  getPlatformsRequiringMedia,
  getSelectedComposerPlatforms,
} from "./shared";

export const validateMessage = (state: ComposerState): ValidationError[] => {
  const errors: ValidationError[] = [];

  const hasText = Boolean(state.contentCreateData.base.message?.trim());
  const mediaOrLink = resolveHasMediaOrLink(
    state.contentCreateData.base.attachments,
    state.contentCreateData.placements.facebookFeed,
  );
  const selectedPlatforms = getSelectedComposerPlatforms(state);

  const needsMediaPlatforms = getPlatformsRequiringMedia(state, mediaOrLink);

  const missingPlatforms = !hasText && !mediaOrLink ? selectedPlatforms : [];

  const exclusiveMissingPlatforms = missingPlatforms.filter(
    (platform) => !needsMediaPlatforms.includes(platform),
  );

  if (exclusiveMissingPlatforms.length > 0) {
    errors.push({
      type: "no_message",
      message: "Add text or attach media to publish.",
      severity: "error",
      field: "message",
      platforms: exclusiveMissingPlatforms,
    });
  }

  return errors;
};
