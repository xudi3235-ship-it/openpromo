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
import { useMemo } from "react";
import type { ConnectedAccount } from "@/lib/hono-client";
import { useComposerStore } from "@/stores/composer-store";

export interface PreviewData {
  pageName: string;
  profilePicUrl: string;
  username?: string;
  platform: Platform;
  attachments: SharedAttachmentSpec[];
  message: string;
  callToAction?: FBFeedPlacementSpec["postSpec"]["callToAction"];
  // Helper methods for display names
  getDisplayName: (fallbackWorkspaceName?: string) => string;
  getInstagramUsername: (fallbackWorkspaceName?: string) => string;
}

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
}

export const useComposerPreview = (
  options: PreviewOptions = {},
): PreviewData => {
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

    // Helper functions for display names
    const getDisplayName = (fallbackWorkspaceName?: string) => {
      return (
        displayData.pageName || fallbackWorkspaceName || "No Account Selected"
      );
    };

    const getInstagramUsername = (fallbackWorkspaceName?: string) => {
      const formatAsUsername = (name: string) =>
        name.toLowerCase().replace(/\s+/g, "_");

      return (
        displayData.username ||
        (displayData.pageName
          ? formatAsUsername(displayData.pageName)
          : undefined) ||
        (fallbackWorkspaceName
          ? formatAsUsername(fallbackWorkspaceName)
          : undefined) ||
        "your_business"
      );
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

    return {
      ...displayData,
      attachments: getAttachmentsForAccount(),
      message: getMessageForAccount(),
      callToAction: getCallToActionForAccount(),
      getDisplayName,
      getInstagramUsername,
    };
  }, [
    accounts,
    activeAccount,
    selectedPreview,
    options.accountId,
    options.platform,
    contentCreateData.base.attachments,
    contentCreateData.base.message,
    placementsByAccount,
  ]);
};
