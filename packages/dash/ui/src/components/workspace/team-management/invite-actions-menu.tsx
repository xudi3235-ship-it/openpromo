import { Button } from "@openpromo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import type { WorkspaceInviteSummary } from "./utils";

type InviteActionsMenuProps = {
  invite: WorkspaceInviteSummary;
  onResend?: (invite: WorkspaceInviteSummary) => void;
  onRevoke?: (invite: WorkspaceInviteSummary) => void;
  disabled?: boolean;
};

export function InviteActionsMenu({
  invite,
  onResend,
  onRevoke,
  disabled,
}: InviteActionsMenuProps) {
  const [open, setOpen] = useState(false);

  const handleResend = () => {
    setOpen(false);
    onResend?.(invite);
  };

  const handleRevoke = () => {
    setOpen(false);
    onRevoke?.(invite);
  };

  const hasActions = Boolean(onResend || onRevoke);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          disabled={disabled || !hasActions}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open invite actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {onResend ? (
          <DropdownMenuItem onSelect={handleResend}>
            Resend invite
          </DropdownMenuItem>
        ) : null}
        {onRevoke ? (
          <DropdownMenuItem onSelect={handleRevoke}>
            Revoke invite
          </DropdownMenuItem>
        ) : null}
        {!hasActions ? (
          <DropdownMenuItem disabled>No actions available</DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
