import { WORKSPACE_ROLE } from "@core/domain/workspace/auth";
import { Avatar, AvatarFallback } from "@openpromo/ui/components/avatar";
import { Badge } from "@openpromo/ui/components/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@openpromo/ui/components/table";
import type { WorkspaceMember as WorkspaceMemberResponse } from "@worker/routes/api/workspaces/team";
import { UserPlus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useWorkspaceMembers } from "@/queries/workspace";

type WorkspaceMember = WorkspaceMemberResponse;
type WorkspaceRoleValue = (typeof WORKSPACE_ROLE)[keyof typeof WORKSPACE_ROLE];

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

const formatRoleSlug = (slug?: string) => {
  if (!slug) return "Member";
  return slug
    .replace(/^workspace_/, "")
    .split("_")
    .filter(Boolean)
    .map(capitalize)
    .join(" ");
};

const ROLE_OPTIONS: Array<{ value: WorkspaceRoleValue; label: string }> = [
  { value: WORKSPACE_ROLE.ADMIN, label: formatRoleSlug(WORKSPACE_ROLE.ADMIN) },
  {
    value: WORKSPACE_ROLE.EDITOR,
    label: formatRoleSlug(WORKSPACE_ROLE.EDITOR),
  },
  {
    value: WORKSPACE_ROLE.VIEWER,
    label: formatRoleSlug(WORKSPACE_ROLE.VIEWER),
  },
];

const getRoleLabel = (role?: WorkspaceMember["role"]) => {
  if (!role) return "Member";
  return role.name || formatRoleSlug(role.slug);
};

const getMemberName = (member: WorkspaceMember) => {
  const first = member.user?.firstName?.trim();
  const last = member.user?.lastName?.trim();
  const fullName = [first, last].filter(Boolean).join(" ");

  if (fullName) return fullName;
  if (member.user?.email) return member.user.email;
  if (member.user?.id) return `User ${member.user.id.slice(0, 6)}`;
  return "Workspace member";
};

const getMemberInitials = (member: WorkspaceMember) => {
  const initials = [member.user?.firstName?.[0], member.user?.lastName?.[0]]
    .filter((char): char is string => Boolean(char))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (initials) return initials;

  const email = member.user?.email;
  if (email) {
    const scrubbed = email.replace(/[^A-Za-z0-9]/g, "").slice(0, 2);
    if (scrubbed) return scrubbed.toUpperCase();
  }

  return "??";
};

export function TeamManagement() {
  const { data, isPending, isError } = useWorkspaceMembers();
  const members = data?.members ?? [];
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formState, setFormState] = useState<{
    email: string;
    role: WorkspaceRoleValue;
  }>({
    email: "",
    role: WORKSPACE_ROLE.VIEWER,
  });

  const handleInvite = () => {
    if (!formState.email.trim()) {
      toast.error("Please enter an email address.");
      return;
    }

    const emailExists = members.some(
      (member) =>
        member.user?.email?.toLowerCase() === formState.email.toLowerCase(),
    );

    if (emailExists) {
      toast.error("That email is already part of this workspace.");
      return;
    }

    toast.success("Invite queued", {
      description: `We'll invite ${formState.email} as a ${formatRoleSlug(formState.role)} once invitations are available.`,
    });

    setIsDialogOpen(false);
    setFormState({ email: "", role: WORKSPACE_ROLE.VIEWER });
  };

  const handleRemove = (member: WorkspaceMember) => {
    toast.info("Member management coming soon", {
      description: `${getMemberName(member)} will stay in the workspace until removals are supported.`,
    });
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" /> Invite teammate
              </Button>
            </DialogTrigger>
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
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        email: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Role
                  </label>
                  <Select
                    value={formState.role}
                    onValueChange={(value) =>
                      setFormState((prev) => ({
                        ...prev,
                        role: value as WorkspaceRoleValue,
                      }))
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
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleInvite}>Send invite</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-xs text-muted-foreground">
          Admins can publish and manage members, editors can collaborate on
          content, and viewers have read-only access.
        </p>
      </div>

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

            {!isPending && !isError && members.length === 0 && (
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
                const canRemove = member.role?.slug !== WORKSPACE_ROLE.ADMIN;
                const email = member.user?.email ?? "—";

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
                        {getRoleLabel(member.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">Active</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canRemove && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          onClick={() => handleRemove(member)}
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">Remove member</span>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
