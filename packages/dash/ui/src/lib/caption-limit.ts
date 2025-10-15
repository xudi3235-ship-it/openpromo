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
  limitPlatforms: CaptionPlatform[];
  ok: boolean;
  state: CaptionValidationState;
  overLimit: boolean;
  needsMediaForIG: boolean;
  emptyAll: boolean;
}

export const uCount = (value: string | undefined | null): number =>
  [...(value ?? "")].length;

export interface CaptionLimitDetail {
  limit: number;
  platforms: CaptionPlatform[];
}

const resolvePlatforms = (
  selectedPlatforms: CaptionPlatform[],
): CaptionPlatform[] => {
  if (selectedPlatforms.length === 0) {
    return ["facebook"];
  }

  return selectedPlatforms;
};

const getPlatformLimit = (
  platform: CaptionPlatform,
  hasMediaOrLink: boolean,
  platformCount: number,
): number => {
  if (platform === "facebook") {
    if (platformCount === 1) {
      return hasMediaOrLink
        ? RULES.facebook.limitMedia
        : RULES.facebook.limitText;
    }

    return RULES.facebook.limitMedia;
  }

  return RULES[platform].limitText;
};

export const getCaptionLimitDetail = (
  selectedPlatforms: CaptionPlatform[],
  hasMediaOrLink: boolean,
): CaptionLimitDetail => {
  const platforms = resolvePlatforms(selectedPlatforms);
  const platformCount = platforms.length;

  const perPlatformLimits = platforms.map((platform) => ({
    platform,
    limit: getPlatformLimit(platform, hasMediaOrLink, platformCount),
  }));

  const limit = perPlatformLimits.reduce(
    (min, entry) => Math.min(min, entry.limit),
    Number.POSITIVE_INFINITY,
  );

  const enforcingPlatforms = perPlatformLimits
    .filter((entry) => entry.limit === limit)
    .map((entry) => entry.platform);

  return {
    limit,
    platforms: enforcingPlatforms,
  };
};

export const getCaptionLimit = (
  selectedPlatforms: CaptionPlatform[],
  hasMediaOrLink: boolean,
): number => getCaptionLimitDetail(selectedPlatforms, hasMediaOrLink).limit;

export const getLimit = getCaptionLimit;

export const validateCaption = (
  text: string,
  selectedPlatforms: CaptionPlatform[],
  hasMediaOrLink: boolean,
): CaptionValidationResult => {
  const { limit, platforms: limitPlatforms } = getCaptionLimitDetail(
    selectedPlatforms,
    hasMediaOrLink,
  );
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
    limitPlatforms,
    ok,
    state,
    overLimit,
    needsMediaForIG,
    emptyAll,
  };
};
