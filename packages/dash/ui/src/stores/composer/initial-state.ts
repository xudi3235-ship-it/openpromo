import type {
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
  TikTokFeedPlacementSpec,
} from "@shared/content";
import type { ComposerProps, ComposerState } from "./types";
import { buildPlacementRegistry } from "./utils/placements";
import { createInitialSnapshot } from "./utils/snapshot";
import { validateComposerState } from "./utils/validation/index";

const DEFAULT_PROPS: ComposerProps = {
  initialAccounts: [],
  initialPlacementSelected: "ALL",
  initialSelectedPreview: "FACEBOOK",
  initialMessage: "",
  contentGroupID: undefined,
  treatInitialContentAsUnsaved: false,
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

  const baseAttachments = props.initContentCreateData?.base?.attachments || [];

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
          attachments: baseAttachments,
          customized: false,
          firstComment: props.initContentCreateData?.base?.firstComment,
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

  const baseAttachments = props.initContentCreateData?.base?.attachments || [];

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
          attachments: baseAttachments,
          customized: false,
          firstComment: props.initContentCreateData?.base?.firstComment,
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

  const baseAttachments = props.initContentCreateData?.base?.attachments || [];

  return (
    (props.initialAccounts
      ?.map((acc) => {
        if (acc.platform !== "TIKTOK") return null;

        // Handle different TikTok account metadata types
        const metadata = acc.metadata as
          | { type: "DEVELOPER_OAUTH"; tiktokUserId: string }
          | { type: "BUSINESS_LOGIN"; businessAccountId: string }
          | { type: "ADVERTISER"; advertiserId: string };

        // Extract the appropriate user ID based on account type
        let tiktokUserID: string;
        // TODO: we should only allow busienss login. clean this up.
        // later we can consider more account types.
        if (metadata.type === "BUSINESS_LOGIN") {
          tiktokUserID = metadata.businessAccountId;
        } else if (metadata.type === "DEVELOPER_OAUTH") {
          tiktokUserID = metadata.tiktokUserId;
        } else {
          // ADVERTISER accounts are not supported for organic content posting
          tiktokUserID = "TODO_UNSUPPORTED_ADVERTISER_ACCOUNT";
        }
        return {
          identity: {
            connectedAccountID: acc.id,
            tiktokUserID,
          },
          placement: "TT_FEED",
          caption: props.initialMessage || "",
          attachments: baseAttachments,
          customized: false,
          firstComment: props.initContentCreateData?.base?.firstComment,
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

  const baseData = props.initContentCreateData?.base
    ? { ...props.initContentCreateData.base }
    : {
        message: props.initialMessage || "",
        publishingStatus: "PUBLISH_NOW" as const,
        attachments: [],
        firstComment: undefined,
      };

  const contentCreateData: ComposerState["contentCreateData"] = {
    base: baseData,
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

  const initialSnapshot = props.treatInitialContentAsUnsaved
    ? createInitialSnapshot(
        {
          base: {
            message: "",
            publishingStatus: "PUBLISH_NOW",
            attachments: [],
            firstComment: undefined,
            schedulingSpec: undefined,
          },
          placements: { facebookFeed: [], instagramFeed: [], tiktokFeed: [] },
        },
        [],
      )
    : createInitialSnapshot(contentCreateData, selectedAccounts);

  const state: ComposerState = {
    placementSelected: props.initialPlacementSelected || "ALL",
    selectedPreview: props.initialSelectedPreview || "FACEBOOK",
    accounts: props.initialAccounts || [],
    selectedAccounts,
    activeAccount: null,
    contentCreateData,
    placementsByAccount: buildPlacementRegistry(
      props.initialAccounts || [],
      contentCreateData.placements,
    ),
    contentGroupID: props.contentGroupID ?? null,
    validation: { isValid: false, errors: [], canPublish: false },
    initialSnapshot,
  };

  state.validation = validateComposerState(state);

  return state;
};
