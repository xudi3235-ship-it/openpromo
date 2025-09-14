import type { Platform } from "@core/schemas/connected-account.sql";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@openpromo/ui/components/avatar";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { AvailablePlatformsRow } from "@/components/connected-accounts/available-platforms-row";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useHonoMutation } from "@/lib/hono-client";
import { handlePopupMessage, openPopup } from "@/lib/popup";
import { QUERY_KEYS } from "@/lib/query";
import { useComposerStore } from "@/stores/composer-store";

function getPlatformColors(platform: Platform) {
  switch (platform) {
    case "FACEBOOK":
      return "from-blue-500 to-blue-600";
    case "INSTAGRAM":
      return "from-purple-500 via-pink-500 to-orange-500";
    case "TIKTOK":
      return "from-black to-gray-800";
    default:
      return "from-gray-400 to-gray-500";
  }
}

function getPlatformFallback(platform: Platform) {
  switch (platform) {
    case "FACEBOOK":
      return "FB";
    case "INSTAGRAM":
      return "IG";
    case "TIKTOK":
      return "TT";
    default:
      return "?";
  }
}

interface CompactAvatarProps {
  account: {
    id: string;
    platform: Platform;
    accountName?: string | null;
    profilePictureUrl?: string | null;
  };
  selected: boolean;
  active: boolean;
  onToggleSelected: () => void;
  onSetActive: () => void;
}

function CompactAvatar({
  account,
  selected,
  active,
  onToggleSelected,
  onSetActive,
}: CompactAvatarProps) {
  const gradientColors = getPlatformColors(account.platform);
  const fallback = getPlatformFallback(account.platform);

  return (
    <div className="relative group flex flex-col items-center gap-1">
      {/* Avatar */}
      <button
        type="button"
        className="relative w-8 h-8 rounded-full focus:outline-none focus:ring-2 focus:ring-ring transition-all hover:scale-105"
        onClick={onToggleSelected}
        aria-label={`${selected ? "Disable" : "Enable"} posting to ${account.accountName || account.platform}`}
      >
        <div
          className={`w-8 h-8 rounded-full bg-gradient-to-r ${gradientColors} p-0.5 transition-all ${
            selected ? "opacity-100" : "opacity-40"
          }`}
        >
          <div className="w-full h-full bg-background rounded-full p-0.5">
            <Avatar className="w-full h-full">
              <AvatarImage
                src={account.profilePictureUrl || ""}
                alt={account.accountName || "Account"}
              />
              <AvatarFallback className="text-xs font-semibold">
                {fallback}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Selection indicator */}
        {selected && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border border-background rounded-full flex items-center justify-center">
            <svg
              className="w-1.5 h-1.5 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </button>

      {/* Active indicator below avatar */}
      {selected && (
        <button
          type="button"
          className={`w-6 h-1 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-ring ${
            active
              ? "bg-primary shadow-sm"
              : "bg-muted hover:bg-muted-foreground/30"
          }`}
          onClick={onSetActive}
          aria-label={`${active ? "Stop customizing" : "Start customizing"} ${account.accountName || account.platform}`}
        />
      )}

      {/* Tooltip on hover */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md border opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30">
        <div className="text-center">
          <div className="font-medium">
            {account.accountName || account.platform}
          </div>
          <div className="text-muted-foreground">
            {!selected
              ? "Click to enable"
              : active
                ? "Customizing • Click bar to stop"
                : "Click bar to customize"}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AccountSelection() {
  const {
    accounts,
    selectedAccounts,
    setSelectedAccounts,
    activeAccount,
    setActiveAccount,
  } = useComposerStore();
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  useEffect(() => {
    function handleMessage(event: MessageEvent<unknown>) {
      const payload = handlePopupMessage(event, "accounts_connected");
      if (!payload) return;

      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.CONNECTED_ACCOUNTS(workspace.slug),
      });
      toast[payload.status](payload.message);
    }

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [queryClient, workspace.slug]);

  // Facebook OAuth mutation
  const { mutate: initiateFacebookOAuth, isPending: isConnectingFacebook } =
    useHonoMutation({
      mutationFn: (api, variables: { state?: string }) =>
        api.workspaces[":workspaceSlug"].connected_accounts.facebook.auth.$get({
          query: { state: variables.state },
          param: { workspaceSlug: workspace.slug },
        }),
      onError: (error) => {
        toast.error(`Failed to initiate Facebook OAuth: ${error.message}`);
      },
      onSuccess({ data: { url } }) {
        openPopup({
          url,
          target: "facebook-oauth",
          width: 600,
          height: 800,
        });
      },
    });

  // Instagram OAuth mutation
  const { mutate: initiateInstagramOAuth, isPending: isConnectingInstagram } =
    useHonoMutation({
      mutationFn: (api, variables: { state?: string }) =>
        api.workspaces[":workspaceSlug"].connected_accounts.instagram.auth.$get(
          {
            query: { state: variables.state },
            param: { workspaceSlug: workspace.slug },
          },
        ),
      onError: (error) => {
        toast.error(`Failed to initiate Instagram OAuth: ${error.message}`);
      },
      onSuccess({ data: { url } }) {
        openPopup({
          url,
          target: "instagram-oauth",
          width: 600,
          height: 800,
        });
      },
    });

  const handleConnectFacebook = () => {
    initiateFacebookOAuth({});
  };

  const handleConnectInstagram = () => {
    initiateInstagramOAuth({});
  };

  const isConnecting = isConnectingFacebook || isConnectingInstagram;

  const handleToggleAccount = (accountId: string) => {
    const newSelection = selectedAccounts.includes(accountId)
      ? selectedAccounts.filter((id: string) => id !== accountId)
      : [...selectedAccounts, accountId];
    setSelectedAccounts(newSelection);
  };

  const handleSetActive = (accountId: string) => {
    if (selectedAccounts.includes(accountId)) {
      setActiveAccount(accountId);
    }
  };

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Accounts</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {selectedAccounts.length}/{accounts.length}
          </span>
          {activeAccount && (
            <>
              <span>•</span>
              <span className="text-primary">customizing</span>
            </>
          )}
        </div>
      </div>

      {/* Horizontal Account Row */}
      {accounts.length === 0 ? (
        <div className="flex items-center justify-center py-4">
          <AvailablePlatformsRow
            onConnectFacebook={handleConnectFacebook}
            onConnectInstagram={handleConnectInstagram}
            isConnecting={isConnecting}
            size="md"
          />
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {accounts.map((account, index) => (
              <div
                key={account.id}
                className={`relative ${activeAccount === account.id ? "z-30" : selectedAccounts.includes(account.id) ? "z-20" : "z-10"}`}
                style={{
                  zIndex:
                    activeAccount === account.id
                      ? 30
                      : selectedAccounts.includes(account.id)
                        ? 20 + index
                        : 10 + index,
                }}
              >
                <CompactAvatar
                  account={account}
                  selected={selectedAccounts.includes(account.id)}
                  active={activeAccount === account.id}
                  onToggleSelected={() => handleToggleAccount(account.id)}
                  onSetActive={() => handleSetActive(account.id)}
                />
              </div>
            ))}
          </div>

          {/* Add button with separator */}
          <div className="w-px h-4 bg-border" />
          <AvailablePlatformsRow
            onConnectFacebook={handleConnectFacebook}
            onConnectInstagram={handleConnectInstagram}
            isConnecting={isConnecting}
            size="md"
          />
        </div>
      )}
    </div>
  );
}
