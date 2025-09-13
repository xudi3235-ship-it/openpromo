import type { Platform } from "@core/schemas/connected-account.sql";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@openpromo/ui/components/avatar";
import { Plus } from "lucide-react";

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

interface ConnectedAccount {
  id: string;
  platform: Platform;
  accountName?: string | null;
  profilePictureUrl?: string | null;
}

interface ConnectedAccountsRowProps {
  accounts: ConnectedAccount[];
  onAddAccount?: () => void;
  showAddButton?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

interface AccountAvatarProps {
  account: ConnectedAccount;
  size: "sm" | "md" | "lg";
  showTooltip?: boolean;
}

function AccountAvatar({
  account,
  size,
  showTooltip = false,
}: AccountAvatarProps) {
  const gradientColors = getPlatformColors(account.platform);
  const fallback = getPlatformFallback(account.platform);

  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  return (
    <div className="relative group">
      <div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-r ${gradientColors} p-0.5`}
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

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md border opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
          <div className="text-center">
            <div className="font-medium">
              {account.accountName || account.platform}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddAccountButton({
  onAdd,
  size,
}: {
  onAdd?: () => void;
  size: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  const iconSizes = {
    sm: "h-2.5 w-2.5",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  };

  return (
    <div className="relative group">
      <button
        type="button"
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 transition-all focus:outline-none focus:ring-2 focus:ring-ring`}
        onClick={onAdd}
      >
        <Plus className={`${iconSizes[size]} text-muted-foreground`} />
      </button>

      {/* Tooltip */}
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md border opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
        Add account
      </div>
    </div>
  );
}

export function ConnectedAccountsRow({
  accounts,
  onAddAccount,
  showAddButton = false,
  size = "md",
  className = "",
}: ConnectedAccountsRowProps) {
  if (accounts.length === 0 && !showAddButton) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {accounts.map((account) => (
        <AccountAvatar
          key={account.id}
          account={account}
          size={size}
          showTooltip={true}
        />
      ))}

      {showAddButton && (
        <>
          {accounts.length > 0 && <div className="w-px h-4 bg-border mx-1" />}
          <AddAccountButton onAdd={onAddAccount} size={size} />
        </>
      )}
    </div>
  );
}
