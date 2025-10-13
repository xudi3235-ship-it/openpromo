import { Button } from "@openpromo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@openpromo/ui/components/dialog";
import { Input } from "@openpromo/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@openpromo/ui/components/select";
import { WORKSPACE_ROLE } from "@shared/workspace/auth";
import type { ChangeEvent, ReactNode } from "react";
import type { WorkspaceRoleValue } from "./utils";
import { ROLE_OPTIONS } from "./utils";

export interface InviteFormState {
  email: string;
  role: WorkspaceRoleValue;
}

interface InviteTeammateDialogProps {
  trigger: ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formState: InviteFormState;
  onFormChange: (state: InviteFormState) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function InviteTeammateDialog({
  trigger,
  isOpen,
  onOpenChange,
  formState,
  onFormChange,
  onSubmit,
  isSubmitting,
}: InviteTeammateDialogProps) {
  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFormChange({ ...formState, email: event.target.value });
  };

  const handleRoleChange = (role: WorkspaceRoleValue) => {
    onFormChange({ ...formState, role });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to workspace</DialogTitle>
          <DialogDescription>
            Send an invitation email so they can join this workspace.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-muted-foreground">
              Email address
            </label>
            <Input
              type="email"
              placeholder="teammate@company.com"
              value={formState.email}
              onChange={handleEmailChange}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-muted-foreground">
              Role
            </label>
            <Select
              value={formState.role}
              onValueChange={(value) =>
                handleRoleChange(value as WorkspaceRoleValue)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function createInitialInviteFormState(): InviteFormState {
  return {
    email: "",
    role: WORKSPACE_ROLE.VIEWER,
  };
}
