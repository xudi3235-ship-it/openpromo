import { Button } from "@openpromo/ui/components/button";
import type {
  WorkspaceMember,
  WorkspaceTeamInviteResponse,
} from "@worker/routes/api/workspaces/team";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useInviteWorkspaceMember,
  useRevokeWorkspaceInvite,
  useWorkspaceMembers,
} from "@/queries/workspace";
import {
  createInitialInviteFormState,
  type InviteFormState,
  InviteTeammateDialog,
} from "./invite-teammate-dialog";
import {
  formatRoleSlug,
  getMemberName,
  type WorkspaceInviteSummary,
} from "./utils";
import { WorkspaceTeamTable } from "./workspace-team-table";

export function TeamManagement() {
  const { data, isPending, isError } = useWorkspaceMembers();
  const members = data?.members ?? [];
  const invites = data?.invites ?? [];

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formState, setFormState] = useState<InviteFormState>(
    createInitialInviteFormState(),
  );

  const inviteMemberMutation = useInviteWorkspaceMember();
  const revokeInviteMutation = useRevokeWorkspaceInvite();

  const resetDialogState = () => {
    setIsDialogOpen(false);
    setFormState(createInitialInviteFormState());
  };

  const handleInvite = () => {
    if (!formState.email.trim()) {
      toast.error("Please enter an email address.");
      return;
    }

    inviteMemberMutation.mutate(
      {
        email: formState.email,
        role: formState.role,
      },
      {
        onSuccess: (result: WorkspaceTeamInviteResponse) => {
          if ("member" in result) {
            const messageMap = {
              created: "Member added",
              updated: "Member role updated",
              unchanged: "Member already has this role",
            } as const;

            const memberName = getMemberName(result.member);
            const roleLabel =
              result.member.role.name ||
              formatRoleSlug(result.member.role.slug);

            const description = (() => {
              if (result.status === "created") {
                return `${memberName} can start collaborating right away.`;
              }
              if (result.status === "updated") {
                return `${memberName} now has ${roleLabel} access.`;
              }
              return `${memberName} already had ${roleLabel} access.`;
            })();

            toast.success(messageMap[result.status], { description });
          } else {
            const alreadyPending = result.status === "already_invited";
            toast.success(
              alreadyPending ? "Invitation already sent" : "Invitation sent",
              {
                description: alreadyPending
                  ? `${result.invitation.email} still has a pending invite.`
                  : `We emailed ${result.invitation.email} with instructions to join the workspace.`,
              },
            );
          }

          resetDialogState();
        },
      },
    );
  };

  const handleRemove = (member: WorkspaceMember) => {
    toast.info("Member management coming soon", {
      description: `${getMemberName(member)} will stay in the workspace until removals are supported.`,
    });
  };

  const handleRevokeInvite = (invite: WorkspaceInviteSummary) => {
    revokeInviteMutation.mutate(
      { inviteId: invite.id },
      {
        onSuccess: () => {
          toast.success("Invitation removed", {
            description: `${invite.email} can no longer join with that invite link.`,
          });
        },
      },
    );
  };

  const inviteTrigger = (
    <Button className="gap-2">
      <UserPlus className="h-4 w-4" /> Invite teammate
    </Button>
  );

  const handleFormChange = (state: InviteFormState) => {
    setFormState(state);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Team</h1>
            <p className="text-sm text-muted-foreground">
              Manage who can collaborate in this workspace and what they can do.
            </p>
          </div>
          <InviteTeammateDialog
            trigger={inviteTrigger}
            isOpen={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            formState={formState}
            onFormChange={handleFormChange}
            onSubmit={handleInvite}
            isSubmitting={inviteMemberMutation.isPending}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Admins can publish and manage members, editors can collaborate on
          content, and viewers have read-only access.
        </p>
      </div>

      <WorkspaceTeamTable
        members={members}
        invites={invites}
        isLoading={isPending}
        isError={isError}
        onRemoveMember={handleRemove}
        onRevokeInvite={handleRevokeInvite}
        inviteActionsDisabled={revokeInviteMutation.isPending}
      />
    </div>
  );
}
