import type { SharedAttachmentSpec } from "@shared/content";
import type {
  CaptionPlatform,
  CaptionValidationResult,
} from "@/lib/caption-limit";
import { getCaptionLimit, uCount, validateCaption } from "@/lib/caption-limit";
import type { ComposerState } from "@/stores/composer/types";

type ComposerPlatform = "FACEBOOK" | "INSTAGRAM" | "TIKTOK";

const toCaptionPlatform = (platform: ComposerPlatform): CaptionPlatform => {
  switch (platform) {
    case "FACEBOOK":
      return "facebook";
    case "INSTAGRAM":
      return "instagram";
    case "TIKTOK":
      return "tiktok";
    default:
      return "facebook";
  }
};

export const resolveSelectedPlatforms = (
  accounts: { id: string; platform: string }[],
  selectedAccounts: string[],
): CaptionPlatform[] => {
  const set = new Set<CaptionPlatform>();

  selectedAccounts.forEach((accountId) => {
    const account = accounts.find((acc) => acc.id === accountId);
    if (!account) return;
    set.add(toCaptionPlatform(account.platform as ComposerPlatform));
  });

  if (set.size > 0) {
    return Array.from(set);
  }

  if (accounts.length > 0) {
    return [toCaptionPlatform(accounts[0].platform as ComposerPlatform)];
  }

  return ["facebook"];
};

export const resolveHasMediaOrLink = (
  attachments: SharedAttachmentSpec[] | undefined,
  facebookPlacements: NonNullable<
    ComposerState["contentCreateData"]
  >["placements"]["facebookFeed"],
): boolean => {
  if (attachments && attachments.length > 0) return true;
  return (facebookPlacements ?? []).some((placement) =>
    Boolean(placement.postSpec?.link?.trim()),
  );
};

export const getCaptionValidation = (
  state: ComposerState,
  text: string,
): CaptionValidationResult => {
  const platforms = resolveSelectedPlatforms(
    state.accounts,
    state.selectedAccounts,
  );
  const mediaOrLink = resolveHasMediaOrLink(
    state.contentCreateData.base.attachments,
    state.contentCreateData.placements.facebookFeed,
  );
  return validateCaption(text, platforms, mediaOrLink);
};

export const getCaptionLimitOnly = (state: ComposerState): number => {
  const platforms = resolveSelectedPlatforms(
    state.accounts,
    state.selectedAccounts,
  );
  const mediaOrLink = resolveHasMediaOrLink(
    state.contentCreateData.base.attachments,
    state.contentCreateData.placements.facebookFeed,
  );
  return getCaptionLimit(platforms, mediaOrLink);
};

export const getCaptionLength = (text: string): number => uCount(text);
