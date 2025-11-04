import { Button } from "@openpromo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
import { EllipsisVertical, MessageSquarePlus } from "lucide-react";

interface ConversationActionsMenuProps {
  onQuickReply: (e: React.MouseEvent) => void;
  onToggleUnread: () => void;
  isUnread: boolean;
  unreadActionPending?: boolean;
  onDelete: () => void;
  deletePending?: boolean;
}

export function ConversationActionsMenu({
  onQuickReply,
  onToggleUnread,
  isUnread,
  unreadActionPending = false,
  onDelete,
  deletePending = false,
}: ConversationActionsMenuProps) {
  return (
    <div className="flex gap-1.5">
      {/* Quick Reply button */}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={onQuickReply}
        className="h-6 gap-1 px-2 py-0 text-[11px]"
        title="Quick reply"
      >
        <MessageSquarePlus className="h-3 w-3" />
        <span>Reply</span>
      </Button>

      {/* More actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            title="More actions"
          >
            <EllipsisVertical className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem disabled>Pin conversation</DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              if (unreadActionPending) return;
              onToggleUnread();
            }}
            disabled={unreadActionPending}
          >
            {isUnread ? "Mark as read" : "Mark as unread"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>Archive</DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            onSelect={(event) => {
              event.preventDefault();
              if (deletePending) return;
              onDelete();
            }}
            disabled={deletePending}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
