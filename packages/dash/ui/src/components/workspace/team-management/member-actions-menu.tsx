import { Button } from "@openpromo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
import { Edit, MoreHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";
import type { WorkspaceMember } from "./utils";

type MemberActionsMenuProps = {
  member: WorkspaceMember;
  onEditRole?: (member: WorkspaceMember) => void;
  onRemove?: (member: WorkspaceMember) => void;
  disabled?: boolean;
  isCurrentUser?: boolean;
};

export function MemberActionsMenu({
  member,
  onEditRole,
  onRemove,
  disabled,
  isCurrentUser,
}: MemberActionsMenuProps) {
  const [open, setOpen] = useState(false);

  const hasActions = Boolean(onEditRole || onRemove) && !isCurrentUser;

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
          <span className="sr-only">Open member actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {isCurrentUser ? (
          <DropdownMenuItem disabled className="text-muted-foreground">
            This is you
          </DropdownMenuItem>
        ) : (
          <>
            {onEditRole ? (
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  setOpen(false);
                  onEditRole(member);
                }}
              >
                <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
            ) : null}
            {onEditRole && onRemove ? <DropdownMenuSeparator /> : null}
            {onRemove ? (
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  setOpen(false);
                  onRemove(member);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Remove member
              </DropdownMenuItem>
            ) : null}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
