import type { Platform } from "@core/schemas/connected-account.sql";
import type { CaptionPlatform } from "@/lib/caption-limit";
import type { ComposerState } from "../../types";
import { resolveSelectedPlatforms } from "../caption";

const CAPTION_TO_PLATFORM: Record<CaptionPlatform, Platform> = {
  facebook: "FACEBOOK",
  instagram: "INSTAGRAM",
  tiktok: "TIKTOK",
};

const unique = <T>(values: T[]): T[] => Array.from(new Set(values));

export const mapCaptionPlatformsToComposer = (
  platforms: CaptionPlatform[],
): Platform[] =>
  unique(platforms.map((platform) => CAPTION_TO_PLATFORM[platform]));

export const getSelectedComposerPlatforms = (
  state: ComposerState,
): Platform[] => {
  const captionPlatforms = resolveSelectedPlatforms(
    state.accounts,
    state.selectedAccounts,
  );

  if (captionPlatforms.length === 0) {
    return ["FACEBOOK"];
  }

  return mapCaptionPlatformsToComposer(captionPlatforms);
};
