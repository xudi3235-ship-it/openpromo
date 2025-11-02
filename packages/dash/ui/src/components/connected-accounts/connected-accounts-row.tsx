import type { Platform } from "@core/schemas/connected-account.sql";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@openpromo/ui/components/avatar";
import { Badge } from "@openpromo/ui/components/badge";
import { cn } from "@openpromo/ui/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  type MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { Loader2, Plus, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { getPlatformMeta } from "@/components/composer/utils/platform-style";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PlatformAvatarBadge } from "@/components/shared/platform-avatar-badge";
import { useWorkspace } from "@/hooks/useWorkspace";
import type { ConnectedAccount } from "@/lib/hono-client";
import { useHonoMutation } from "@/lib/hono-client";
import { QUERY_KEYS } from "@/lib/query";
import { useOAuthWithListener } from "@/queries/connected-account";

interface ConnectedAccountsRowProps {
  accounts: ConnectedAccount[];
  showAddButton?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  fullWidth?: boolean;
  appearance?: "default" | "minimal";
}

interface AccountAvatarProps {
  account: ConnectedAccount;
  showTooltip?: boolean;
  mouseX: MotionValue<number>;
}

function SkeletonAvatar({ mouseX }: { mouseX: MotionValue<number> }) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(distance, [-150, 0, 150], [32, 48, 32]);
  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  return (
    <motion.div ref={ref} style={{ width }} className="relative group">
      <motion.div
        style={{ width }}
        className="aspect-square rounded-full bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 p-0.5"
        animate={{
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 1.5,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      >
        <div className="w-full h-full bg-background rounded-full p-0.5">
          <div className="w-full h-full bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full animate-pulse" />
        </div>
      </motion.div>
    </motion.div>
  );
}

function AccountAvatar({
  account,
  showTooltip = false,
  mouseX,
}: AccountAvatarProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const meta = getPlatformMeta(account.platform);
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const isTikTokBusiness =
    account.platform === "TIKTOK" &&
    account.tiktokAuthType === "BUSINESS_LOGIN";

  const { mutateAsync: disconnectAccount, isPending: isDisconnecting } =
    useHonoMutation({
      mutationFn: (api, accountId: string) =>
        api.workspaces[":workspaceSlug"].connected_accounts[
          ":accountId"
        ].$delete({
          param: { workspaceSlug: workspace.slug, accountId: accountId },
        }),
      onSuccess: async () => {
        toast.success("Account disconnected successfully");
        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.CONNECTED_ACCOUNTS(workspace.slug),
        });
      },
    });

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(distance, [-150, 0, 150], [32, 48, 32]);
  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const handleDelete = async () => {
    await disconnectAccount(account.id);
    setShowConfirm(false);
  };

  return (
    <>
      <motion.div ref={ref} style={{ width }} className="relative group">
        <motion.div
          style={{ width }}
          className={cn(
            "aspect-square rounded-full bg-gradient-to-r p-0.5",
            meta.avatarGradient,
          )}
        >
          <div className="w-full h-full bg-background rounded-full p-0.5">
            <Avatar className="w-full h-full">
              <AvatarImage
                src={account.profilePicUrl || ""}
                alt={account.accountName || "Account"}
              />
              <AvatarFallback className="text-xs font-semibold">
                {meta.abbreviation}
              </AvatarFallback>
            </Avatar>
          </div>
        </motion.div>

        <PlatformAvatarBadge
          platform={account.platform}
          isBusiness={isTikTokBusiness}
        />

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md border opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
            <div className="text-center">
              <div className="font-medium">
                {account.accountName || account.platform}
                {isTikTokBusiness && (
                  <span className="ml-1 text-blue-500">(Business)</span>
                )}
              </div>
              {account.followersCount !== null &&
                account.followersCount !== undefined && (
                  <div className="text-muted-foreground text-[10px]">
                    {account.followersCount.toLocaleString()} followers
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Delete Button */}
        <button
          type="button"
          className="absolute -top-1 -right-1 w-4 h-4 bg-red-100 text-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-200 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-ring z-20 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 dark:hover:text-red-300"
          onClick={(e) => {
            e.stopPropagation();
            setShowConfirm(true);
          }}
          aria-label={`Remove ${account.accountName || account.platform} account`}
        >
          <X className="w-2.5 h-2.5" />
        </button>
      </motion.div>{" "}
      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Remove Account"
        desc={`Are you sure you want to remove ${account.accountName || account.platform}? This action cannot be undone.`}
        confirmText="Remove"
        destructive={true}
        handleConfirm={handleDelete}
        isLoading={isDisconnecting}
      />
    </>
  );
}

interface AddButtonProps {
  platform: Platform;
  onClick: () => void;
  isConnecting: boolean;
  mouseX: MotionValue<number>;
  label?: string;
  isBusiness?: boolean;
}

function AddButton({
  platform,
  onClick,
  isConnecting,
  mouseX,
  label,
  isBusiness = false,
}: AddButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const meta = getPlatformMeta(platform);
  const displayLabel = label || meta.label;

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(distance, [-150, 0, 150], [32, 48, 32]);
  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  return (
    <motion.div ref={ref} style={{ width }} className="relative group">
      <motion.button
        type="button"
        style={{ width }}
        className="relative aspect-square rounded-full focus:outline-none focus:ring-2 focus:ring-ring"
        onClick={onClick}
        disabled={isConnecting}
      >
        <div
          className={cn(
            "w-full h-full rounded-full bg-gradient-to-r p-0.5",
            meta.avatarGradient,
          )}
        >
          <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
            {isConnecting ? (
              <Loader2
                className={cn("h-4 w-4 animate-spin", meta.accentTextClass)}
              />
            ) : (
              <Plus className={cn("h-4 w-4", meta.accentTextClass)} />
            )}
          </div>
        </div>

        <PlatformAvatarBadge platform={platform} isBusiness={isBusiness} />
      </motion.button>

      <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md border opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
        {isConnecting ? "Connecting..." : `Add ${displayLabel}`}
      </div>
    </motion.div>
  );
}

export function ConnectedAccountsRow({
  accounts,
  showAddButton = false,
  className = "",
  fullWidth = false,
  appearance = "default",
}: ConnectedAccountsRowProps) {
  const mouseX = useMotionValue(Infinity);
  const {
    handleConnectFacebook,
    handleConnectInstagram,
    handleConnectTikTok,
    handleConnectTikTokBusiness,
    isConnecting,
  } = useOAuthWithListener();

  if (accounts.length === 0 && !showAddButton) {
    return null;
  }

  return (
    <div className={className}>
      <motion.div
        className={cn(
          "flex items-center gap-2 rounded-2xl",
          appearance === "default"
            ? "bg-card border border-border/40 px-4 py-3"
            : "px-0 py-0",
          fullWidth && "w-full",
        )}
        onMouseMove={({ pageX }) => mouseX.set(pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
      >
        {accounts.map((account) => (
          <AccountAvatar
            key={account.id}
            account={account}
            showTooltip={true}
            mouseX={mouseX}
          />
        ))}

        {showAddButton && (
          <>
            {accounts.length > 0 && <div className="w-px h-6 bg-border mx-1" />}
            <AddButton
              platform="FACEBOOK"
              onClick={handleConnectFacebook}
              isConnecting={isConnecting}
              mouseX={mouseX}
            />
            <AddButton
              platform="INSTAGRAM"
              onClick={handleConnectInstagram}
              isConnecting={isConnecting}
              mouseX={mouseX}
            />
            <AddButton
              platform="TIKTOK"
              onClick={handleConnectTikTok}
              isConnecting={isConnecting}
              mouseX={mouseX}
              label="TikTok"
              isBusiness={false}
            />
            {/* TikTok Business - Feature in development */}
            {false && (
              <AddButton
                platform="TIKTOK"
                onClick={handleConnectTikTokBusiness}
                isConnecting={isConnecting}
                mouseX={mouseX}
                label="TikTok Business"
                isBusiness={true}
              />
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}

export function ConnectedAccountsRowSkeleton({
  className = "",
  fullWidth = false,
  appearance = "default",
}: {
  className?: string;
  fullWidth?: boolean;
  appearance?: "default" | "minimal";
}) {
  const mouseX = useMotionValue(Infinity);

  return (
    <div className={className}>
      <motion.div
        className={cn(
          "flex items-center gap-2 rounded-2xl",
          appearance === "default"
            ? "bg-card border border-border/40 px-4 py-3"
            : "px-0 py-0",
          fullWidth && "w-full",
        )}
        onMouseMove={({ pageX }) => mouseX.set(pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
      >
        <SkeletonAvatar mouseX={mouseX} />
        <SkeletonAvatar mouseX={mouseX} />
        <SkeletonAvatar mouseX={mouseX} />
      </motion.div>
    </div>
  );
}

// Composer-specific interfaces
interface ComposerAccountAvatarProps {
  account: ConnectedAccount;
  selected: boolean;
  active: boolean;
  dimmed: boolean;
  showLabels: boolean;
  canCustomize: boolean;
  onToggleSelected: () => void;
  onSetActive: () => void;
}

interface ComposerAccountsRowProps {
  accounts: ConnectedAccount[];
  selectedAccounts: string[];
  activeAccount: string | null;
  onToggleAccount: (accountId: string) => void;
  onSetActiveAccount: (accountId: string) => void;
  showAddButton?: boolean;
  className?: string;
}

function ComposerAccountAvatar({
  account,
  selected,
  active,
  dimmed,
  showLabels,
  canCustomize,
  onToggleSelected,
  onSetActive,
}: ComposerAccountAvatarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const meta = getPlatformMeta(account.platform);
  const accountLabel = account.accountName || meta.label;
  const Icon = meta.icon;
  const isActive = canCustomize && active;
  const isTikTokBusiness =
    account.platform === "TIKTOK" &&
    account.tiktokAuthType === "BUSINESS_LOGIN";

  return (
    <div
      ref={ref}
      className={cn(
        "relative group flex flex-col items-center gap-1.5",
        showLabels && "w-24 text-center transition-opacity",
        dimmed && "opacity-60",
      )}
    >
      <button
        type="button"
        className={cn(
          "relative aspect-square rounded-full focus:outline-none focus:ring-2 focus:ring-ring transition-all",
          showLabels ? "w-10" : "w-8",
          selected ? "opacity-100" : "opacity-40",
          isActive &&
            cn(
              "ring-2 ring-offset-2 ring-offset-background",
              meta.accentRingClass,
            ),
        )}
        onClick={onToggleSelected}
        aria-label={`${selected ? "Disable" : "Enable"} posting to ${account.accountName || account.platform}`}
      >
        <div
          className={cn(
            "w-full h-full rounded-full bg-gradient-to-r p-0.5 transition-all",
            meta.avatarGradient,
            selected ? "opacity-100" : "opacity-40",
          )}
        >
          <div className="w-full h-full bg-background rounded-full p-0.5">
            <Avatar className="w-full h-full">
              <AvatarImage
                src={account.profilePicUrl || ""}
                alt={account.accountName || "Account"}
              />
              <AvatarFallback className="text-xs font-semibold">
                {meta.abbreviation}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        <PlatformAvatarBadge
          platform={account.platform}
          isBusiness={isTikTokBusiness}
        />

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

      {selected && canCustomize && (
        <button
          type="button"
          className={cn(
            "rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-ring hover:h-1.5 focus:h-1.5",
            showLabels ? "w-10 h-1" : "w-6 h-1",
            isActive
              ? cn(meta.accentIndicatorClass, "shadow-sm")
              : "bg-muted hover:bg-muted-foreground/30",
          )}
          onClick={onSetActive}
          aria-label={`${isActive ? "Stop customizing" : "Start customizing"} ${account.accountName || account.platform}`}
        />
      )}

      {showLabels && (
        <div className="space-y-1">
          <div
            className="text-xs font-medium text-foreground truncate"
            title={accountLabel}
          >
            {accountLabel}
          </div>
          {isActive ? (
            <Badge
              variant="secondary"
              className={cn(
                "mx-auto flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-muted",
                meta.accentTextClass,
              )}
            >
              <Icon className={cn("h-3 w-3", meta.accentTextClass)} />
              <span>Customizing</span>
            </Badge>
          ) : (
            <div className="text-[11px] text-muted-foreground">
              {selected ? "Enabled" : "Off"}
            </div>
          )}
        </div>
      )}

      <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md border opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30">
        <div className="text-center">
          <div className="font-medium">{accountLabel}</div>
          <div className="text-muted-foreground">
            {!selected
              ? "Click to enable"
              : isActive
                ? "Customizing • Click bar to stop"
                : canCustomize
                  ? "Click bar to customize"
                  : "Enabled"}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ComposerAccountsRow({
  accounts,
  selectedAccounts,
  activeAccount,
  onToggleAccount,
  onSetActiveAccount,
  showAddButton = false,
  className = "",
}: ComposerAccountsRowProps) {
  const staticMouseX = useMotionValue(Infinity);
  const {
    handleConnectFacebook,
    handleConnectInstagram,
    handleConnectTikTok,
    handleConnectTikTokBusiness,
    isConnectingFacebook,
    isConnectingInstagram,
    isConnectingTikTok,
    isConnectingTikTokBusiness,
  } = useOAuthWithListener();
  const canCustomize = accounts.length > 1;
  const hasActiveCustomization = canCustomize && Boolean(activeAccount);

  const handleSetActive = (accountId: string) => {
    if (!canCustomize) return;
    if (selectedAccounts.includes(accountId)) {
      onSetActiveAccount(accountId);
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2 bg-card border border-border/40 rounded-2xl px-4 py-2.5">
        {accounts.map((account) => (
          <ComposerAccountAvatar
            key={account.id}
            account={account}
            selected={selectedAccounts.includes(account.id)}
            active={activeAccount === account.id}
            dimmed={
              hasActiveCustomization &&
              selectedAccounts.includes(account.id) &&
              account.id !== activeAccount
            }
            showLabels={hasActiveCustomization}
            canCustomize={canCustomize}
            onToggleSelected={() => onToggleAccount(account.id)}
            onSetActive={() => handleSetActive(account.id)}
          />
        ))}

        {showAddButton && (
          <>
            {accounts.length > 0 && <div className="w-px h-6 bg-border mx-1" />}
            <AddButton
              platform="FACEBOOK"
              onClick={handleConnectFacebook}
              isConnecting={isConnectingFacebook}
              mouseX={staticMouseX}
            />
            <AddButton
              platform="INSTAGRAM"
              onClick={handleConnectInstagram}
              isConnecting={isConnectingInstagram}
              mouseX={staticMouseX}
            />
            <AddButton
              platform="TIKTOK"
              onClick={handleConnectTikTok}
              isConnecting={isConnectingTikTok}
              mouseX={staticMouseX}
              label="TikTok"
              isBusiness={false}
            />
            {/* TikTok Business - Feature in development */}
            {false && (
              <AddButton
                platform="TIKTOK"
                onClick={handleConnectTikTokBusiness}
                isConnecting={isConnectingTikTokBusiness}
                mouseX={staticMouseX}
                label="TikTok Business"
                isBusiness={true}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
