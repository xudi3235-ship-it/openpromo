import type {
  FBPageMetadata,
  IGAccountMetadata,
  Platform,
  TikTokAccountMetadata,
} from "@core/schemas/connected-account.sql";
import type { SharedAttachmentSpec } from "@core/schemas/content.sql";
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

export const useComposerPreview = (): PreviewData => {
  const accounts = useComposerStore((state) => state.accounts);
  const activeAccount = useComposerStore((state) => state.activeAccount);
  const selectedPreview = useComposerStore((state) => state.selectedPreview);
  const contentCreateData = useComposerStore(
    (state) => state.contentCreateData,
  );

  return useMemo(() => {
    // Find the account to display based on active account or selected preview platform
    let targetAccount: ConnectedAccount | undefined;

    if (activeAccount) {
      targetAccount = accounts.find((acc) => acc.id === activeAccount);
    } else {
      // Fallback to first account matching the selected preview platform
      targetAccount = accounts.find((acc) => acc.platform === selectedPreview);
    }

    // If still no account found, use the first available account
    if (!targetAccount && accounts.length > 0) {
      targetAccount = accounts[0];
    }

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

      // If this is the active account being customized, get its specific message
      if (activeAccount === targetAccount.id) {
        if (targetAccount.platform === "FACEBOOK") {
          const fbSpec = contentCreateData.placements.facebookFeed?.find(
            (spec) => spec.identity.connectedAccountID === targetAccount.id,
          );
          return (
            fbSpec?.postSpec.message || contentCreateData.base.message || ""
          );
        } else if (targetAccount.platform === "INSTAGRAM") {
          const igSpec = contentCreateData.placements.instagramFeed?.find(
            (spec) => spec.identity.connectedAccountID === targetAccount.id,
          );
          return igSpec?.caption || contentCreateData.base.message || "";
        } else if (targetAccount.platform === "TIKTOK") {
          const ttSpec = contentCreateData.placements.tiktokFeed?.find(
            (spec) => spec.identity.connectedAccountID === targetAccount.id,
          );
          return ttSpec?.caption || contentCreateData.base.message || "";
        }
      }

      // For non-active accounts, check if they have customized messages
      if (targetAccount.platform === "FACEBOOK") {
        const fbSpec = contentCreateData.placements.facebookFeed?.find(
          (spec) => spec.identity.connectedAccountID === targetAccount.id,
        );
        if (fbSpec?.customized) {
          return fbSpec.postSpec.message || "";
        }
      } else if (targetAccount.platform === "INSTAGRAM") {
        const igSpec = contentCreateData.placements.instagramFeed?.find(
          (spec) => spec.identity.connectedAccountID === targetAccount.id,
        );
        if (igSpec?.customized) {
          return igSpec.caption || "";
        }
      } else if (targetAccount.platform === "TIKTOK") {
        const ttSpec = contentCreateData.placements.tiktokFeed?.find(
          (spec) => spec.identity.connectedAccountID === targetAccount.id,
        );
        if (ttSpec?.customized) {
          return ttSpec.caption || "";
        }
      }

      // Fallback to base message for non-customized accounts
      return contentCreateData.base.message || "";
    };

    return {
      ...displayData,
      attachments: contentCreateData.base.attachments || [],
      message: getMessageForAccount(),
      getDisplayName,
      getInstagramUsername,
    };
  }, [
    accounts,
    activeAccount,
    selectedPreview,
    contentCreateData.base.attachments,
    contentCreateData.base.message,
    contentCreateData.placements.facebookFeed,
    contentCreateData.placements.instagramFeed,
    contentCreateData.placements.tiktokFeed,
  ]);
};
