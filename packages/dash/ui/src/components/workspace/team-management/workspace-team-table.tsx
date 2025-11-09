import { Avatar, AvatarFallback } from "@openpromo/ui/components/avatar";
import { Badge } from "@openpromo/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@openpromo/ui/components/table";
import type {
  WorkspaceInviteSummary,
  WorkspaceMember,
} from "@worker/routes/api/workspaces/team";
import { useActor } from "@/hooks/useActor";
import { InviteActionsMenu } from "./invite-actions-menu";
import { MemberActionsMenu } from "./member-actions-menu";
import {
  formatInviteDate,
  formatInviteStatus,
  formatRoleSlug,
  getDisplayNameFromEmail,
  getInviteInitials,
  getMemberInitials,
  getMemberName,
} from "./utils";

type WorkspaceTeamTableProps = {
  members: WorkspaceMember[];
  invites: WorkspaceInviteSummary[];
  isPending: boolean;
  isError: boolean;
  onEditMemberRole?: (member: WorkspaceMember) => void;
  onRemoveMember?: (member: WorkspaceMember) => void;
  onRevokeInvite?: (invite: WorkspaceInviteSummary) => void;
  inviteActionsDisabled?: boolean;
  memberActionsDisabled?: boolean;
};

export function WorkspaceTeamTable({
  members,
  invites,
  isPending,
  isError,
  onEditMemberRole,
  onRemoveMember,
  onRevokeInvite,
  inviteActionsDisabled,
  memberActionsDisabled,
}: WorkspaceTeamTableProps) {
  const actor = useActor();
  const hasMembers = members.length > 0;
  const hasInvites = invites.length > 0;

  return (
    <div className="overflow-hidden rounded-xl border border-border/40 bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Member</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[120px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isPending &&
            Array.from({ length: 3 }).map((_, index) => (
              <TableRow
                key={`member-skeleton-${
                  // biome-ignore lint/suspicious/noArrayIndexKey: later
                  index
                }`}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                    <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="h-5 w-16 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell />
              </TableRow>
            ))}

          {isError && !isPending && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="py-6 text-center text-sm text-muted-foreground"
              >
                Unable to load workspace members.
              </TableCell>
            </TableRow>
          )}

          {!isPending && !isError && !hasMembers && !hasInvites && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="py-6 text-center text-sm text-muted-foreground"
              >
                No teammates yet. Invite someone to get started.
              </TableCell>
            </TableRow>
          )}

          {!isPending &&
            !isError &&
            members.map((member) => {
              const email = member.user?.email ?? "—";
              const isCurrentUser = member.user?.id === actor.id;

              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {getMemberInitials(member)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {getMemberName(member)}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {email}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {member.role?.name || formatRoleSlug(member.role?.slug)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">Active</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <MemberActionsMenu
                      member={member}
                      isCurrentUser={isCurrentUser}
                      onEditRole={onEditMemberRole}
                      onRemove={!isCurrentUser ? onRemoveMember : undefined}
                      disabled={memberActionsDisabled}
                    />
                  </TableCell>
                </TableRow>
              );
            })}

          {!isPending &&
            !isError &&
            invites.map((invite) => {
              const inviteeName =
                getDisplayNameFromEmail(invite.email) ?? invite.email;
              return (
                <TableRow key={`invite-${invite.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {getInviteInitials(invite.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {inviteeName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {invite.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Invited {formatInviteDate(invite.invitedAt)}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {invite.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {invite.role.name || formatRoleSlug(invite.role.slug)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {formatInviteStatus(invite.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    <InviteActionsMenu
                      invite={invite}
                      onRevoke={onRevokeInvite}
                      disabled={inviteActionsDisabled}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    </div>
  );
}
