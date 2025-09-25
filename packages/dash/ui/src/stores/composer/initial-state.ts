import type {
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
  TikTokFeedPlacementSpec,
} from "@core/schemas/content.sql";
import type { ComposerProps, ComposerState } from "./types";
import { validateComposerState } from "./utils/validation";

const DEFAULT_PROPS: ComposerProps = {
  initialAccounts: [],
  initialPlacementSelected: "ALL",
  initialSelectedPreview: "FACEBOOK",
  initialMessage: "",
};

export const resolveComposerProps = (
  initProps: Partial<ComposerProps>,
): ComposerProps => ({ ...DEFAULT_PROPS, ...initProps });

const buildInitialFacebookPlacements = (
  props: ComposerProps,
): FBFeedPlacementSpec[] => {
  if (props.initContentCreateData?.placements?.facebookFeed) {
    return props.initContentCreateData.placements.facebookFeed;
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
): IGFeedPlacementSpec[] => {
  if (props.initContentCreateData?.placements?.instagramFeed) {
    return props.initContentCreateData.placements.instagramFeed;
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

const buildInitialTikTokPlacements = (props: ComposerProps) => {
  if (props.initContentCreateData?.placements?.tiktokFeed) {
    return props.initContentCreateData.placements.tiktokFeed;
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
          placement: "TIKTOK_FEED" as const,
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
  const contentCreateData = props.initContentCreateData ?? {
    base: {
      message: props.initialMessage || "",
      publishingStatus: "PUBLISH_NOW" as const,
      attachments: [],
    },
    placements: {
      facebookFeed: buildInitialFacebookPlacements(props),
      instagramFeed: buildInitialInstagramPlacements(props),
      tiktokFeed: buildInitialTikTokPlacements(props),
    },
  };

  const state: ComposerState = {
    placementSelected: props.initialPlacementSelected || "ALL",
    selectedPreview: props.initialSelectedPreview || "FACEBOOK",
    accounts: props.initialAccounts || [],
    selectedAccounts: props.initialAccounts?.map((acc) => acc.id) || [],
    activeAccount: null,
    contentCreateData,
    validation: { isValid: false, errors: [], canPublish: false },
  };

  state.validation = validateComposerState(state);

  return state;
};
