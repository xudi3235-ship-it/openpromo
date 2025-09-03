import { Button } from "@openpromo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
import { Typography } from "@openpromo/ui/components/typography";
import { ChevronRight, MoreHorizontal, Users } from "lucide-react";

interface ConnectedAccount {
  id: string;
  platform: string;
  accountName: string;
  accountId: string;
  avatar: string;
  isConnected: boolean;
  lastSync: string;
  followers?: number;
}

interface ConnectedAccountCardProps {
  account: ConnectedAccount;
}

export function ConnectedAccountCard({ account }: ConnectedAccountCardProps) {
  const formatFollowers = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <div className="p-6 bg-sidebar rounded-xl border border-sidebar-border hover:border-sidebar-border/80 transition-all duration-200 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <img
            src={account.avatar}
            alt={account.platform}
            className="w-10 h-10 rounded-lg"
          />
          <div>
            <Typography.H4 className="mb-1">
              {account.accountName}
            </Typography.H4>
            <Typography.Small className="text-[var(--neutral-600)]">
              {account.accountId}
            </Typography.Small>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View Settings</DropdownMenuItem>
            <DropdownMenuItem>Refresh Connection</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <Typography.Small className="text-[var(--neutral-700)]">
              Connected
            </Typography.Small>
          </div>
          <Typography.Small className="text-[var(--neutral-600)]">
            Last sync: {account.lastSync}
          </Typography.Small>
        </div>

        {account.followers && (
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[var(--neutral-600)]" />
            <Typography.Small className="text-[var(--neutral-700)]">
              {formatFollowers(account.followers)} followers
            </Typography.Small>
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        className="w-full justify-between group-hover:bg-sidebar-accent transition-colors"
      >
        <span>Manage Account</span>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
