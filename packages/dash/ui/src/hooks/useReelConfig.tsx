import type { Platform } from "@core/schemas/connected-account.sql";
import { Send, Share } from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useComposerPreview } from "@/stores/composer-preview-store";

export interface ReelPlatformConfig {
  colors: {
    avatar: string;
    followButton: string;
  };
  icons: {
    share: typeof Share | typeof Send;
  };
  text: {
    followButton: string;
    placeholder: string;
  };
  engagement: {
    likes: string;
    comments: string;
    shares?: string;
  };
}

const PLATFORM_CONFIGS: Record<string, ReelPlatformConfig> = {
  instagram: {
    colors: {
      avatar: "bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400",
      followButton: "bg-white/20",
    },
    icons: {
      share: Send,
    },
    text: {
      followButton: "Follow",
      placeholder: "Add a caption to describe your reel...",
    },
    engagement: {
      likes: "1.2K",
      comments: "89",
    },
  },
  facebook: {
    colors: {
      avatar: "bg-blue-600",
      followButton: "bg-blue-600",
    },
    icons: {
      share: Share,
    },
    text: {
      followButton: "Follow",
      placeholder: "Add a description to your reel...",
    },
    engagement: {
      likes: "2.1K",
      comments: "156",
      shares: "42",
    },
  },
  tiktok: {
    colors: {
      avatar: "bg-black",
      followButton: "bg-red-500",
    },
    icons: {
      share: Share,
    },
    text: {
      followButton: "Follow",
      placeholder: "Add a description...",
    },
    engagement: {
      likes: "5.2K",
      comments: "234",
      shares: "128",
    },
  },
  youtube: {
    colors: {
      avatar: "bg-red-600",
      followButton: "bg-red-600",
    },
    icons: {
      share: Share,
    },
    text: {
      followButton: "Subscribe",
      placeholder: "Add a title for your Short...",
    },
    engagement: {
      likes: "3.8K",
      comments: "178",
    },
  },
};

export function useReelConfig(
  platform: string,
  accountId?: string,
  placement?: "FEED" | "REEL",
) {
  const { workspace } = useWorkspace();
  const previewData = useComposerPreview({
    platform: platform.toUpperCase() as Platform,
    accountId,
    placement,
  });

  const config = PLATFORM_CONFIGS[platform] || PLATFORM_CONFIGS.instagram;

  const getUsername = () => {
    const accountName =
      previewData.accountName ?? workspace?.name ?? "Your Account";

    if (platform === "instagram") {
      return accountName.toLowerCase().replace(/\s+/g, "_");
    }
    if (platform === "facebook") {
      return accountName;
    }
    if (platform === "tiktok") {
      return `@${accountName.toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
    }
    if (platform === "youtube") {
      return accountName;
    }
    return accountName.toLowerCase().replace(/\s+/g, "_");
  };

  const renderAvatar = (className: string = "w-7 h-7") => {
    const profilePicUrl = previewData.profilePicUrl ?? undefined;

    if (platform === "instagram") {
      return profilePicUrl ? (
        <div
          className={`${className} rounded-full ${config.colors.avatar} p-0.5 flex-shrink-0`}
        >
          <img
            src={profilePicUrl}
            alt={getUsername()}
            className="w-full h-full rounded-full object-cover bg-white"
          />
        </div>
      ) : (
        <div
          className={`${className} rounded-full ${config.colors.avatar} p-0.5 flex-shrink-0`}
        >
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
            <div
              className={`w-5 h-5 rounded-full ${config.colors.avatar}`}
            ></div>
          </div>
        </div>
      );
    }

    // Default avatar for other platforms
    return profilePicUrl ? (
      <img
        src={profilePicUrl}
        alt={getUsername()}
        className={`${className} rounded-full object-cover flex-shrink-0`}
      />
    ) : (
      <div
        className={`${className} rounded-full ${config.colors.avatar} flex items-center justify-center flex-shrink-0`}
      >
        <div className="w-5 h-5 rounded-full bg-white"></div>
      </div>
    );
  };

  return {
    config,
    username: getUsername(),
    renderAvatar,
  };
}
