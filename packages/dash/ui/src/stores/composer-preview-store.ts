import type {
  FBPageMetadata,
  IGAccountMetadata,
  Platform,
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

    return {
      ...displayData,
      attachments: contentCreateData.base.attachments || [],
      message: contentCreateData.base.message || "",
      getDisplayName,
      getInstagramUsername,
    };
  }, [
    accounts,
    activeAccount,
    selectedPreview,
    contentCreateData.base.attachments,
    contentCreateData.base.message,
  ]);
};
