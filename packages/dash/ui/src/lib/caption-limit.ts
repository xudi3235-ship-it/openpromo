export type CaptionPlatform = "facebook" | "instagram" | "tiktok";

export const RULES = {
  facebook: {
    textOnly: true,
    mediaOnly: true,
    limitText: 63_206,
    limitMedia: 5_000,
  },
  instagram: {
    textOnly: false,
    mediaOnly: true,
    limitText: 2_200,
    limitMedia: 2_200,
  },
  tiktok: {
    textOnly: true,
    mediaOnly: true,
    limitText: 2_200,
    limitMedia: 2_200,
  },
} as const satisfies Record<
  CaptionPlatform,
  {
    textOnly: boolean;
    mediaOnly: boolean;
    limitText: number;
    limitMedia: number;
  }
>;

export const PLACEHOLDER = "Write a caption… (optional when media is attached)";

export const TOOLTIP = `Facebook: 63,206 (text-only) / 5,000 (media)
Instagram: requires image or video (2,200)
TikTok: supports text-only and media (2,200)`;

export type CaptionValidationState = "ok" | "warn" | "error";

export interface CaptionValidationResult {
  len: number;
  limit: number;
  ok: boolean;
  state: CaptionValidationState;
  overLimit: boolean;
  needsMediaForIG: boolean;
  emptyAll: boolean;
}

export const uCount = (value: string | undefined | null): number =>
  [...(value ?? "")].length;

export const getCaptionLimit = (
  selectedPlatforms: CaptionPlatform[],
  hasMediaOrLink: boolean,
): number => {
  if (selectedPlatforms.length === 0) {
    return RULES.facebook.limitText;
  }

  if (selectedPlatforms.length === 1 && selectedPlatforms[0] === "facebook") {
    return hasMediaOrLink
      ? RULES.facebook.limitMedia
      : RULES.facebook.limitText;
  }

  const perPlatformLimits = selectedPlatforms.map((platform) =>
    platform === "facebook"
      ? RULES.facebook.limitMedia
      : RULES[platform].limitText,
  );

  return Math.min(...perPlatformLimits);
};

export const getLimit = getCaptionLimit;

export const validateCaption = (
  text: string,
  selectedPlatforms: CaptionPlatform[],
  hasMediaOrLink: boolean,
): CaptionValidationResult => {
  const limit = getCaptionLimit(selectedPlatforms, hasMediaOrLink);
  const len = uCount(text);
  const needsMediaForIG =
    selectedPlatforms.includes("instagram") && !hasMediaOrLink;
  const emptyAll = len === 0 && !hasMediaOrLink;
  const overLimit = len > limit;

  const ok =
    (!needsMediaForIG && !emptyAll && !overLimit) ||
    (hasMediaOrLink && len === 0);

  let state: CaptionValidationState = "ok";
  if (overLimit) {
    state = "error";
  } else if (needsMediaForIG || emptyAll || len >= Math.floor(limit * 0.9)) {
    state = "warn";
  }

  return {
    len,
    limit,
    ok,
    state,
    overLimit,
    needsMediaForIG,
    emptyAll,
  };
};
