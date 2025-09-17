import type { Platform } from "@core/schemas/connected-account.sql";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@openpromo/ui/components/avatar";
import {
  type MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { Plus, X } from "lucide-react";
import { useRef, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { ConnectedAccount } from "@/lib/hono-client";
import { useOAuthWithListener } from "@/queries/connected-account";

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

interface ConnectedAccountsRowProps {
  accounts: ConnectedAccount[];
  onDeleteAccount?: (accountId: string) => void;
  showAddButton?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

interface AccountAvatarProps {
  account: ConnectedAccount;
  showTooltip?: boolean;
  onDelete?: (accountId: string) => void;
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
  onDelete,
  mouseX,
}: AccountAvatarProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const gradientColors = getPlatformColors(account.platform);
  const fallback = getPlatformFallback(account.platform);

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

  const handleDelete = () => {
    onDelete?.(account.id);
    setShowConfirm(false);
  };

  return (
    <>
      <motion.div ref={ref} style={{ width }} className="relative group">
        <motion.div
          style={{ width }}
          className={`aspect-square rounded-full bg-gradient-to-r ${gradientColors} p-0.5`}
        >
          <div className="w-full h-full bg-background rounded-full p-0.5">
            <Avatar className="w-full h-full">
              <AvatarImage
                src={account.profilePicUrl || ""}
                alt={account.accountName || "Account"}
              />
              <AvatarFallback className="text-xs font-semibold">
                {fallback}
              </AvatarFallback>
            </Avatar>
          </div>
        </motion.div>

        {/* Delete Button */}
        {onDelete && (
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
        )}

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
      </motion.div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Remove Account"
        desc={`Are you sure you want to remove ${account.accountName || account.platform}? This action cannot be undone.`}
        confirmText="Remove"
        destructive={true}
        handleConfirm={handleDelete}
      />
    </>
  );
}

function FacebookAddButton({ mouseX }: { mouseX: MotionValue<number> }) {
  const ref = useRef<HTMLDivElement>(null);
  const { handleConnectFacebook, isConnectingFacebook } =
    useOAuthWithListener();

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
        className="aspect-square rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center border-2 border-dashed border-blue-400/30 hover:border-blue-400/50 transition-all focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        onClick={handleConnectFacebook}
        disabled={isConnectingFacebook}
      >
        <Plus className="h-4 w-4 text-white" />
      </motion.button>

      {/* Tooltip */}
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md border opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
        Add Facebook
      </div>
    </motion.div>
  );
}

function InstagramAddButton({ mouseX }: { mouseX: MotionValue<number> }) {
  const ref = useRef<HTMLDivElement>(null);
  const { handleConnectInstagram, isConnectingInstagram } =
    useOAuthWithListener();

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
        className="aspect-square rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center border-2 border-dashed border-purple-400/30 hover:border-purple-400/50 transition-all focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        onClick={handleConnectInstagram}
        disabled={isConnectingInstagram}
      >
        <Plus className="h-4 w-4 text-white" />
      </motion.button>

      {/* Tooltip */}
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md border opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
        Add Instagram
      </div>
    </motion.div>
  );
}

export function ConnectedAccountsRow({
  accounts,
  onDeleteAccount,
  showAddButton = false,
  className = "",
}: ConnectedAccountsRowProps) {
  const mouseX = useMotionValue(Infinity);

  if (accounts.length === 0 && !showAddButton) {
    return null;
  }

  return (
    <div className={className}>
      <motion.div
        className="flex items-center gap-2 bg-card border border-border/40 rounded-2xl px-4 py-3"
        onMouseMove={({ pageX }) => mouseX.set(pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
      >
        {accounts.map((account) => (
          <AccountAvatar
            key={account.id}
            account={account}
            showTooltip={true}
            onDelete={onDeleteAccount}
            mouseX={mouseX}
          />
        ))}

        {showAddButton && (
          <>
            {accounts.length > 0 && <div className="w-px h-6 bg-border mx-1" />}
            <FacebookAddButton mouseX={mouseX} />
            <InstagramAddButton mouseX={mouseX} />
          </>
        )}
      </motion.div>
    </div>
  );
}

export function ConnectedAccountsRowSkeleton({
  className = "",
}: {
  className?: string;
}) {
  const mouseX = useMotionValue(Infinity);

  return (
    <div className={className}>
      <motion.div
        className="flex items-center gap-2 bg-card border border-border/40 rounded-2xl px-4 py-3"
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
