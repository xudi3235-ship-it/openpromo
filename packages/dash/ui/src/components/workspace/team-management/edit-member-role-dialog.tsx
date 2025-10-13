import { Button } from "@openpromo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@openpromo/ui/components/dialog";
import { Label } from "@openpromo/ui/components/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@openpromo/ui/components/radio-group";
import { cn } from "@openpromo/ui/lib/utils";
import { WORKSPACE_ROLE } from "@shared/workspace/auth";
import { Check } from "lucide-react";
import { useState } from "react";
import type { WorkspaceMember } from "./utils";

type EditMemberRoleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: WorkspaceMember | null;
  onConfirm: (memberId: string, newRole: string) => void;
  isLoading?: boolean;
};

const ROLE_OPTIONS = [
  {
    value: WORKSPACE_ROLE.ADMIN,
    label: "Admin",
    description: "Full access to workspace settings and content",
  },
  {
    value: WORKSPACE_ROLE.EDITOR,
    label: "Editor",
    description: "Can create and manage content",
  },
  {
    value: WORKSPACE_ROLE.VIEWER,
    label: "Viewer",
    description: "Can view content only",
  },
];

export function EditMemberRoleDialog({
  open,
  onOpenChange,
  member,
  onConfirm,
  isLoading,
}: EditMemberRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<string>(
    member?.role.slug || WORKSPACE_ROLE.VIEWER,
  );

  const handleConfirm = () => {
    if (member && selectedRole !== member.role.slug) {
      onConfirm(member.id, selectedRole);
    }
  };

  const hasChanged = selectedRole !== member?.role.slug;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit member</DialogTitle>
          <DialogDescription>
            Manage settings for{" "}
            <span className="font-medium text-foreground">
              {member?.user.email}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Label className="text-sm text-muted-foreground">Role</Label>
          <RadioGroup value={selectedRole} onValueChange={setSelectedRole}>
            <div className="space-y-2">
              {ROLE_OPTIONS.map((option) => {
                const isSelected = selectedRole === option.value;
                return (
                  // biome-ignore lint/a11y/noLabelWithoutControl: later
                  <label
                    key={option.value}
                    className={cn(
                      "relative flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all hover:border-primary/50",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background",
                    )}
                  >
                    <RadioGroupItem value={option.value} className="mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium leading-none">
                          {option.label}
                        </p>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!hasChanged || isLoading}
          >
            {isLoading ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
