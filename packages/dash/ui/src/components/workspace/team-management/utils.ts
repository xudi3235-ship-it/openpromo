import { WORKSPACE_ROLE } from "@core/domain/workspace/auth";
import type {
  WorkspaceInviteSummary,
  WorkspaceMember,
} from "@worker/routes/api/workspaces/team";

export type WorkspaceRoleValue =
  (typeof WORKSPACE_ROLE)[keyof typeof WORKSPACE_ROLE];

export const ROLE_OPTIONS: Array<{ value: WorkspaceRoleValue; label: string }> =
  [
    {
      value: WORKSPACE_ROLE.ADMIN,
      label: formatRoleSlug(WORKSPACE_ROLE.ADMIN),
    },
    {
      value: WORKSPACE_ROLE.EDITOR,
      label: formatRoleSlug(WORKSPACE_ROLE.EDITOR),
    },
    {
      value: WORKSPACE_ROLE.VIEWER,
      label: formatRoleSlug(WORKSPACE_ROLE.VIEWER),
    },
  ];

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function formatRoleSlug(slug?: string) {
  if (!slug) return "Member";
  return slug
    .replace(/^workspace_/, "")
    .split("_")
    .filter(Boolean)
    .map(capitalize)
    .join(" ");
}

export function getDisplayNameFromEmail(email?: string | null) {
  if (!email) return undefined;
  const [localPart] = email.split("@");
  if (!localPart) return undefined;
  const cleaned = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((segment) =>
      segment.length === 0
        ? segment
        : segment[0].toUpperCase() + segment.slice(1).toLowerCase(),
    )
    .join(" ");
  return cleaned || undefined;
}

export function getMemberName(member: WorkspaceMember) {
  const first = member.user?.firstName?.trim();
  const last = member.user?.lastName?.trim();
  const fullName = [first, last].filter(Boolean).join(" ");

  if (fullName) return fullName;
  const fromEmail = getDisplayNameFromEmail(member.user?.email);
  if (fromEmail) return fromEmail;
  if (member.user?.email) return member.user.email;
  if (member.user?.id) return `User ${member.user.id.slice(0, 6)}`;
  return "Workspace member";
}

export function getMemberInitials(member: WorkspaceMember) {
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
}

export function getInviteInitials(email: string) {
  const scrubbed = email.replace(/[^A-Za-z0-9]/g, "").slice(0, 2);
  return scrubbed ? scrubbed.toUpperCase() : "??";
}

export function formatInviteStatus(status: string) {
  if (status === "pending") return "Invited";
  return capitalize(status);
}

export function formatInviteDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString();
}

export type { WorkspaceMember, WorkspaceInviteSummary };
