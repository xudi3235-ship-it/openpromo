import type {
  FBPageMetadata,
  IGAccountMetadata,
  Platform,
  TikTokAccountMetadata,
} from "@core/schemas/connected-account.sql";
import type {
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
  SharedAttachmentSpec,
  TikTokFeedPlacementSpec,
} from "@shared/content";
import { AllPlacement } from "@shared/content";
import type {
  ContentPreview,
  FacebookFeedPreview,
  FacebookReelPreview,
  InstagramFeedPreview,
  InstagramReelPreview,
  TikTokFeedPreview,
} from "@shared/content/content-preview";
import { useMemo } from "react";
import type { ConnectedAccount } from "@/lib/hono-client";
import { useComposerStore } from "@/stores/composer-store";

const getAccountDisplayData = (account: ConnectedAccount) => {
  const metadata = account.metadata;

  switch (account.platform) {
    case "FACEBOOK": {
      const fbMeta = metadata as FBPageMetadata;
      return {
        pageName: fbMeta.pageName || "Your Page",
        profilePicUrl: fbMeta.profilePicUrl || "",
        username: undefined,
        platform: account.platform as Platform,
      };
    }
    case "INSTAGRAM": {
      const igMeta = metadata as IGAccountMetadata;
      return {
        pageName: igMeta.username || "Instagram Account",
        profilePicUrl: igMeta.profilePicUrl || "",
        username: igMeta.username,
        platform: account.platform as Platform,
      };
    }
    case "TIKTOK": {
      const ttMeta = metadata as TikTokAccountMetadata;
      if (ttMeta.type === "BUSINESS_LOGIN") {
        return {
          pageName: ttMeta?.businessName,
          profilePicUrl: ttMeta.profilePicUrl || "",
          username: ttMeta?.businessName,
          platform: account.platform as Platform,
        };
      }
      return {
        pageName: ttMeta.username || "TikTok Account",
        profilePicUrl: ttMeta.profilePicUrl || "",
        username: ttMeta.username,
        platform: account.platform as Platform,
      };
    }
    default:
      return {
        pageName: "Unknown Account",
        profilePicUrl: "",
        username: undefined,
        platform: account.platform as Platform,
      };
  }
};

interface PreviewOptions {
  platform?: Platform;
  accountId?: string;
  placement?: "FEED" | "REEL";
}

export const useComposerPreview = (
  options: PreviewOptions = {},
): ContentPreview => {
  const accounts = useComposerStore((state) => state.accounts);
  const activeAccount = useComposerStore((state) => state.activeAccount);
  const selectedPreview = useComposerStore((state) => state.selectedPreview);
  const contentCreateData = useComposerStore(
    (state) => state.contentCreateData,
  );
  const placementsByAccount = useComposerStore(
    (state) => state.placementsByAccount,
  );

  return useMemo(() => {
    // Find the account to display based on active account or selected preview platform
    let targetAccount: ConnectedAccount | undefined;

    if (options.accountId) {
      targetAccount = accounts.find((acc) => acc.id === options.accountId);
    }

    if (!targetAccount && options.platform) {
      targetAccount = accounts.find((acc) => acc.platform === options.platform);
    }

    if (!targetAccount && activeAccount) {
      targetAccount = accounts.find((acc) => acc.id === activeAccount);
    }

    if (!targetAccount) {
      targetAccount =
        accounts.find((acc) => acc.platform === selectedPreview) || accounts[0];
    }

    // If still no account found, use the first available account
    const displayData = targetAccount
      ? getAccountDisplayData(targetAccount)
      : {
          pageName: "No Account Selected",
          profilePicUrl: "",
          username: undefined,
          platform: "FACEBOOK" as Platform,
        };

    // Get the message for the target account (preview account)
    const getMessageForAccount = (): string => {
      if (!targetAccount) {
        return contentCreateData.base.message || "";
      }

      const entry = placementsByAccount?.[targetAccount.id];

      // If this is the active account being customized, get its specific message
      if (activeAccount === targetAccount.id) {
        if (entry?.platform === "FACEBOOK") {
          const spec = entry.spec as FBFeedPlacementSpec;
          return spec.postSpec.message || contentCreateData.base.message || "";
        } else if (entry?.platform === "INSTAGRAM") {
          const spec = entry.spec as IGFeedPlacementSpec;
          return spec.caption || contentCreateData.base.message || "";
        } else if (entry?.platform === "TIKTOK") {
          const spec = entry.spec as TikTokFeedPlacementSpec;
          return spec.caption || contentCreateData.base.message || "";
        }
      }

      // For non-active accounts, check if they have customized messages
      if (entry?.customized) {
        if (entry.platform === "FACEBOOK") {
          const spec = entry.spec as FBFeedPlacementSpec;
          return spec.postSpec.message || "";
        } else if (entry.platform === "INSTAGRAM") {
          const spec = entry.spec as IGFeedPlacementSpec;
          return spec.caption || "";
        } else if (entry.platform === "TIKTOK") {
          const spec = entry.spec as TikTokFeedPlacementSpec;
          return spec.caption || "";
        }
      }

      // Fallback to base message for non-customized accounts
      return contentCreateData.base.message || "";
    };

    const getAttachmentsForAccount = (): SharedAttachmentSpec[] => {
      if (!targetAccount) {
        return contentCreateData.base.attachments || [];
      }

      const entry = placementsByAccount?.[targetAccount.id];
      if (!entry) {
        return contentCreateData.base.attachments || [];
      }

      if (entry.platform === "FACEBOOK") {
        return (
          (entry.spec as FBFeedPlacementSpec).attachments ||
          contentCreateData.base.attachments ||
          []
        );
      }

      if (entry.platform === "INSTAGRAM") {
        return (
          (entry.spec as IGFeedPlacementSpec).attachments ||
          contentCreateData.base.attachments ||
          []
        );
      }

      if (entry.platform === "TIKTOK") {
        return (
          (entry.spec as TikTokFeedPlacementSpec).attachments ||
          contentCreateData.base.attachments ||
          []
        );
      }

      return contentCreateData.base.attachments || [];
    };

    const getCallToActionForAccount = ():
      | FBFeedPlacementSpec["postSpec"]["callToAction"]
      | undefined => {
      if (!targetAccount || targetAccount.platform !== "FACEBOOK") {
        return undefined;
      }

      const entry = placementsByAccount?.[targetAccount.id];
      if (!entry || entry.platform !== "FACEBOOK") {
        return undefined;
      }

      return (entry.spec as FBFeedPlacementSpec).postSpec.callToAction;
    };

    const message = getMessageForAccount();
    const attachments = getAttachmentsForAccount();

    // Determine if this is a reel based on options or content
    const isReel =
      options.placement === "REEL" ||
      (attachments.length === 1 && attachments[0]?.type === "video");

    // Build ContentPreview based on platform
    const platform = displayData.platform;

    if (platform === "INSTAGRAM") {
      if (isReel) {
        const reelPreview: InstagramReelPreview = {
          placement: AllPlacement.IG_REEL,
          accountName: displayData.username || displayData.pageName,
          profilePicUrl: displayData.profilePicUrl || null,
          caption: message || null,
          attachments,
          permalink: null,
          timestampLabel: "2 hours ago",
          metrics: {
            likes: 1200,
            comments: 89,
            shares: 34,
          },
          audioTitle: `Original audio • ${displayData.username || displayData.pageName}`,
        };
        return reelPreview;
      }

      const preview: InstagramFeedPreview = {
        placement: AllPlacement.IG_FEED,
        accountName: displayData.username || displayData.pageName,
        profilePicUrl: displayData.profilePicUrl || null,
        caption: message || null,
        attachments,
        permalink: null,
        timestampLabel: "2 hours ago",
        metrics: {
          likes: 1247,
          comments: 23,
          shares: 8,
        },
        location: "San Francisco, California",
      };
      return preview;
    }

    if (platform === "FACEBOOK") {
      const callToAction = getCallToActionForAccount();
      const callToActionLabel = callToAction
        ? callToAction.type.replace(/_/g, " ").toLowerCase()
        : null;

      if (isReel) {
        const reelPreview: FacebookReelPreview = {
          placement: AllPlacement.FB_REEL,
          accountName: displayData.pageName,
          profilePicUrl: displayData.profilePicUrl || null,
          caption: message || null,
          attachments,
          permalink: null,
          timestampLabel: "2 hours ago",
          metrics: {
            likes: 2100,
            comments: 156,
            shares: 42,
          },
          audioTitle: "Original audio",
          callToActionLabel,
        };
        return reelPreview;
      }

      const preview: FacebookFeedPreview = {
        placement: AllPlacement.FB_FEED,
        accountName: displayData.pageName,
        profilePicUrl: displayData.profilePicUrl || null,
        caption: message || null,
        attachments,
        permalink: null,
        timestampLabel: "2 hours ago",
        metrics: {
          likes: 142,
          comments: 23,
          shares: 8,
        },
        callToActionLabel,
      };
      return preview;
    }

    if (platform === "TIKTOK") {
      const preview: TikTokFeedPreview = {
        placement: AllPlacement.TT_FEED,
        accountName: displayData.username || displayData.pageName,
        profilePicUrl: displayData.profilePicUrl || null,
        caption: message || null,
        attachments,
        permalink: null,
        timestampLabel: "2 hours ago",
        metrics: {
          likes: 1200,
          comments: 245,
          shares: 89,
        },
        musicTitle: `Original sound • ${displayData.pageName}`,
      };
      return preview;
    }

    // Fallback to Instagram if platform is unknown
    const fallbackPreview: InstagramFeedPreview = {
      placement: AllPlacement.IG_FEED,
      accountName: displayData.pageName,
      profilePicUrl: displayData.profilePicUrl || null,
      caption: message || null,
      attachments,
      permalink: null,
      timestampLabel: "2 hours ago",
      metrics: undefined,
      location: null,
    };
    return fallbackPreview;
  }, [
    accounts,
    activeAccount,
    selectedPreview,
    options.accountId,
    options.platform,
    options.placement,
    contentCreateData.base.attachments,
    contentCreateData.base.message,
    placementsByAccount,
  ]);
};
