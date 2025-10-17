import type {
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
  TikTokFeedPlacementSpec,
} from "@shared/content";
import type { ComposerProps, ComposerState } from "./types";
import { createInitialSnapshot } from "./utils/snapshot";
import { validateComposerState } from "./utils/validation/index";

const DEFAULT_PROPS: ComposerProps = {
  initialAccounts: [],
  initialPlacementSelected: "ALL",
  initialSelectedPreview: "FACEBOOK",
  initialMessage: "",
  contentGroupID: undefined,
};

export const resolveComposerProps = (
  initProps: Partial<ComposerProps>,
): ComposerProps => ({ ...DEFAULT_PROPS, ...initProps });

const buildInitialFacebookPlacements = (
  props: ComposerProps,
  isEditFlow: boolean,
): FBFeedPlacementSpec[] => {
  const initPlacements = props.initContentCreateData?.placements?.facebookFeed;
  if (initPlacements !== undefined) {
    return initPlacements;
  }

  if (isEditFlow) {
    return [];
  }

  return (
    (props.initialAccounts
      ?.map((acc) => {
        if (acc.platform !== "FACEBOOK") return null;

        return {
          identity: {
            connectedAccountID: acc.id,
            fbPageID: (acc.metadata as { pageID: string }).pageID,
          },
          placement: "FB_FEED" as const,
          postSpec: {
            message: props.initialMessage || "",
          },
          attachments: [],
          customized: false,
        } satisfies FBFeedPlacementSpec;
      })
      .filter(Boolean) as FBFeedPlacementSpec[]) || []
  );
};

const buildInitialInstagramPlacements = (
  props: ComposerProps,
  isEditFlow: boolean,
): IGFeedPlacementSpec[] => {
  const initPlacements = props.initContentCreateData?.placements?.instagramFeed;
  if (initPlacements !== undefined) {
    return initPlacements;
  }

  if (isEditFlow) {
    return [];
  }

  return (
    (props.initialAccounts
      ?.map((acc) => {
        if (acc.platform !== "INSTAGRAM") return null;

        return {
          identity: {
            connectedAccountID: acc.id,
            igAccountID: (acc.metadata as { igAccountID: string }).igAccountID,
          },
          placement: "IG_FEED" as const,
          caption: props.initialMessage || "",
          attachments: [],
          customized: false,
        } satisfies IGFeedPlacementSpec;
      })
      .filter(Boolean) as IGFeedPlacementSpec[]) || []
  );
};

const buildInitialTikTokPlacements = (
  props: ComposerProps,
  isEditFlow: boolean,
): TikTokFeedPlacementSpec[] => {
  const initPlacements = props.initContentCreateData?.placements?.tiktokFeed;
  if (initPlacements !== undefined) {
    return initPlacements;
  }

  if (isEditFlow) {
    return [];
  }

  return (
    (props.initialAccounts
      ?.map((acc) => {
        if (acc.platform !== "TIKTOK") return null;

        return {
          identity: {
            connectedAccountID: acc.id,
            tiktokUserID: (acc.metadata as { tiktokUserId: string })
              .tiktokUserId,
          },
          placement: "TT_FEED",
          caption: props.initialMessage || "",
          attachments: [],
          customized: false,
        } satisfies TikTokFeedPlacementSpec;
      })
      .filter(Boolean) as TikTokFeedPlacementSpec[]) || []
  );
};

export const createComposerInitialState = (
  props: ComposerProps,
): ComposerState => {
  const placementsFromData = props.initContentCreateData?.placements;
  const hasExistingPlacements = Boolean(
    placementsFromData &&
      ((placementsFromData.facebookFeed?.length ?? 0) > 0 ||
        (placementsFromData.instagramFeed?.length ?? 0) > 0 ||
        (placementsFromData.tiktokFeed?.length ?? 0) > 0),
  );
  const isEditFlow = hasExistingPlacements || Boolean(props.contentGroupID);

  const placements = {
    facebookFeed: buildInitialFacebookPlacements(props, isEditFlow),
    instagramFeed: buildInitialInstagramPlacements(props, isEditFlow),
    tiktokFeed: buildInitialTikTokPlacements(props, isEditFlow),
  };

  const contentCreateData: ComposerState["contentCreateData"] = {
    base: props.initContentCreateData?.base ?? {
      message: props.initialMessage || "",
      publishingStatus: "PUBLISH_NOW" as const,
      attachments: [],
    },
    placements,
  };

  const placementAccountIds = [
    ...placements.facebookFeed.map((spec) => spec.identity.connectedAccountID),
    ...placements.instagramFeed.map((spec) => spec.identity.connectedAccountID),
    ...placements.tiktokFeed.map((spec) => spec.identity.connectedAccountID),
  ];

  const selectedAccounts = isEditFlow
    ? Array.from(new Set(placementAccountIds))
    : props.initialAccounts?.map((acc) => acc.id) || [];

  const state: ComposerState = {
    placementSelected: props.initialPlacementSelected || "ALL",
    selectedPreview: props.initialSelectedPreview || "FACEBOOK",
    accounts: props.initialAccounts || [],
    selectedAccounts,
    activeAccount: null,
    contentCreateData,
    contentGroupID: props.contentGroupID ?? null,
    validation: { isValid: false, errors: [], canPublish: false },
    initialSnapshot: createInitialSnapshot(contentCreateData, selectedAccounts),
  };

  state.validation = validateComposerState(state);

  return state;
};
