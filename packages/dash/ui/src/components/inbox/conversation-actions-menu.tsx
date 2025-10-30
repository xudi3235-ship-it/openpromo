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
}

export function ConversationActionsMenu({
  onQuickReply,
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
          <DropdownMenuItem>Pin conversation</DropdownMenuItem>
          <DropdownMenuItem>Mark as unread</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Archive</DropdownMenuItem>
          <DropdownMenuItem className="text-destructive">
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
