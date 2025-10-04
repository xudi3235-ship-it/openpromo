import { Button } from "@openpromo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import type { WorkspaceMember } from "./utils";

type MemberActionsMenuProps = {
  member: WorkspaceMember;
  onRemove: (member: WorkspaceMember) => void;
  disabled?: boolean;
};

export function MemberActionsMenu({
  member,
  onRemove,
  disabled,
}: MemberActionsMenuProps) {
  const [open, setOpen] = useState(false);

  const handleRemove = () => {
    setOpen(false);
    onRemove(member);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          disabled={disabled}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open member actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={handleRemove}>
          Remove member
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
