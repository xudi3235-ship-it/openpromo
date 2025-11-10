import { getDbClient } from "@core/database/db";
import { Actor } from "@core/helpers/actor";
import { getWorkOS } from "@core/providers/workos";
import { workspaceInvitesTable } from "@core/schemas/workspace-invites.sql";
import { workspaceRoleAssignmentsTable } from "@core/schemas/workspace-role-assignments.sql";
import { workspaceRolesTable } from "@core/schemas/workspace-roles.sql";
import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";
import {
  hasWorkspacePermission,
  ORGANIZATION_ROLE,
  WORKSPACE_PERMISSION,
  WORKSPACE_ROLE,
} from "@shared/workspace/auth";
import type { User } from "@workos-inc/node";
import { and, eq } from "drizzle-orm";
import * as z from "zod";
import { assertUser } from "../../../helpers/auth";
import { createVisibleError } from "../../../helpers/error";
import { orpcBuilder } from "../../context";
import { withWorkspaceRole } from "../../middleware";
import {
  WorkspaceIdentifierSchema,
  workspaceRoleMappers,
} from "../../shared/workspace-helpers";

// ============================================================================
// Types
// ============================================================================

export type WorkspaceMemberRole = {
  id: string;
  slug: string;
  name: string;
  description?: string;
};

export type WorkspaceMember = {
  id: string;
  workspaceId: string;
  roleId: string;
  role: WorkspaceMemberRole;
  user: Partial<User>;
};

export type WorkspaceInviteSummary = {
  id: string;
  workspaceId: string;
  roleId: string;
  email: string;
  status: string;
  invitedAt: string;
  role: WorkspaceMemberRole;
};

// ============================================================================
// Input Schemas
// ============================================================================

const listTeamInput = WorkspaceIdentifierSchema.extend({
  workspaceSlug: z.string().min(1),
});

const inviteMemberInput = WorkspaceIdentifierSchema.extend({
  workspaceSlug: z.string().min(1),
  email: z.string().email().trim(),
  role: z
    .enum([WORKSPACE_ROLE.ADMIN, WORKSPACE_ROLE.EDITOR, WORKSPACE_ROLE.VIEWER])
    .default(WORKSPACE_ROLE.VIEWER),
});

const updateMemberRoleInput = WorkspaceIdentifierSchema.extend({
  workspaceSlug: z.string().min(1),
  memberId: z.string().min(1),
  role: z.enum([
    WORKSPACE_ROLE.ADMIN,
    WORKSPACE_ROLE.EDITOR,
    WORKSPACE_ROLE.VIEWER,
  ]),
});

const removeMemberInput = WorkspaceIdentifierSchema.extend({
  workspaceSlug: z.string().min(1),
  memberId: z.string().min(1),
});

const revokeInviteInput = WorkspaceIdentifierSchema.extend({
  workspaceSlug: z.string().min(1),
  inviteId: z.string().min(1),
});

// ============================================================================
// Handlers
// ============================================================================

export const listTeam = orpcBuilder
  .input(listTeamInput)
  .use(withWorkspaceRole, workspaceRoleMappers.viewer)
  .handler(async () => {
    const db = getDbClient();
    const workOS = getWorkOS();
    const actor = Actor.assert("workspace_user");
    const workspaceId = actor.properties.workspaceID;

    // Check permission
    if (
      !hasWorkspacePermission(
        actor.properties.workspacePermissions,
        WORKSPACE_PERMISSION.TEAM_VIEW,
      )
    ) {
      throw createVisibleError(403, {
        message: "You don't have permission to view team members",
      });
    }

    const assignments = await db
      .select({
        id: workspaceRoleAssignmentsTable.id,
        workspaceId: workspaceRoleAssignmentsTable.workspaceId,
        assigneeId: workspaceRoleAssignmentsTable.assigneeId,
        roleId: workspaceRoleAssignmentsTable.roleId,
        roleName: workspaceRolesTable.name,
        roleSlug: workspaceRolesTable.slug,
        roleDescription: workspaceRolesTable.description,
      })
      .from(workspaceRoleAssignmentsTable)
      .innerJoin(
        workspaceRolesTable,
        eq(workspaceRoleAssignmentsTable.roleId, workspaceRolesTable.id),
      )
      .where(
        and(
          eq(workspaceRoleAssignmentsTable.workspaceId, workspaceId),
          eq(workspaceRoleAssignmentsTable.assigneeType, "user"),
        ),
      );

    // Fetch user details from WorkOS
    const members = await Promise.all(
      assignments.map(async (assignment) => {
        const user = await workOS.userManagement.getUser(assignment.assigneeId);
        return {
          id: assignment.id,
          workspaceId: assignment.workspaceId,
          roleId: assignment.roleId,
          role: {
            id: assignment.roleId,
            slug: assignment.roleSlug,
            name: assignment.roleName,
            description: assignment.roleDescription ?? undefined,
          },
          user: {
            id: user.id,
            email: user.email ?? undefined,
            firstName: user.firstName || "",
            lastName: user.lastName || "",
          },
        } satisfies WorkspaceMember;
      }),
    );

    const invites = await db
      .select({
        id: workspaceInvitesTable.id,
        workspaceId: workspaceInvitesTable.workspaceId,
        roleId: workspaceInvitesTable.roleId,
        roleSlug: workspaceRolesTable.slug,
        roleName: workspaceRolesTable.name,
        roleDescription: workspaceRolesTable.description,
        email: workspaceInvitesTable.email,
        status: workspaceInvitesTable.status,
        createdAt: workspaceInvitesTable.createdAt,
      })
      .from(workspaceInvitesTable)
      .innerJoin(
        workspaceRolesTable,
        eq(workspaceInvitesTable.roleId, workspaceRolesTable.id),
      )
      .where(
        and(
          eq(workspaceInvitesTable.workspaceId, workspaceId),
          eq(workspaceInvitesTable.status, "pending"),
        ),
      );

    const inviteSummaries: WorkspaceInviteSummary[] = invites.map((invite) => ({
      id: invite.id,
      workspaceId: invite.workspaceId,
      roleId: invite.roleId,
      email: invite.email,
      status: invite.status,
      invitedAt: invite.createdAt.toISOString(),
      role: {
        id: invite.roleId,
        slug: invite.roleSlug,
        name: invite.roleName,
        description: invite.roleDescription ?? undefined,
      },
    }));

    return {
      members,
      invites: inviteSummaries,
    };
  });

export const inviteMember = orpcBuilder
  .input(inviteMemberInput)
  .use(withWorkspaceRole, workspaceRoleMappers.admin)
  .handler(async ({ input, context }) => {
    const honoCtx = context.honoContext;
    const { email, role } = input;
    const normalizedEmail = email.toLowerCase();

    const db = getDbClient();
    const workOS = getWorkOS();
    const actor = Actor.assert("workspace_user");
    const user = assertUser(honoCtx);

    const workspaceId = actor.properties.workspaceID;
    const organizationId = actor.properties.organizationID;

    // Check permission
    if (
      !hasWorkspacePermission(
        actor.properties.workspacePermissions,
        WORKSPACE_PERMISSION.TEAM_INVITE,
      )
    ) {
      throw createVisibleError(403, {
        message: "You don't have permission to invite team members",
      });
    }

    const [roleRecord] = await db
      .select({
        id: workspaceRolesTable.id,
        name: workspaceRolesTable.name,
        description: workspaceRolesTable.description,
        slug: workspaceRolesTable.slug,
      })
      .from(workspaceRolesTable)
      .where(eq(workspaceRolesTable.slug, role))
      .limit(1);

    if (!roleRecord) {
      throw createVisibleError(400, {
        message: `Workspace role ${role} not found`,
      });
    }

    const users = await workOS.userManagement.listUsers({
      email: normalizedEmail,
    });
    const existingUser = users.data.find(
      (candidate) => candidate.email?.toLowerCase() === normalizedEmail,
    );

    if (existingUser) {
      const memberships =
        await workOS.userManagement.listOrganizationMemberships({
          organizationId,
          userId: existingUser.id,
        });

      let hasActiveMembership = memberships.data.some(
        (membership) => membership.status === "active",
      );
      const hasPendingMembership = memberships.data.some(
        (membership) => membership.status === "pending",
      );
      const hasAnyMembership = memberships.data.length > 0;

      if (!hasAnyMembership) {
        const membership =
          await workOS.userManagement.createOrganizationMembership({
            organizationId,
            userId: existingUser.id,
            roleSlug: ORGANIZATION_ROLE.MEMBER,
          });
        hasActiveMembership = membership.status === "active";
      }

      if (hasActiveMembership) {
        const [existingAssignment] = await db
          .select({
            id: workspaceRoleAssignmentsTable.id,
            roleId: workspaceRoleAssignmentsTable.roleId,
          })
          .from(workspaceRoleAssignmentsTable)
          .where(
            and(
              eq(workspaceRoleAssignmentsTable.workspaceId, workspaceId),
              eq(workspaceRoleAssignmentsTable.assigneeId, existingUser.id),
            ),
          )
          .limit(1);

        let assignmentId = existingAssignment?.id;
        let status: "created" | "updated" | "unchanged" = "unchanged";

        if (!existingAssignment) {
          const [inserted] = await db
            .insert(workspaceRoleAssignmentsTable)
            .values({
              workspaceId,
              roleId: roleRecord.id,
              assigneeType: "user",
              assigneeId: existingUser.id,
            })
            .returning({
              id: workspaceRoleAssignmentsTable.id,
            });

          assignmentId = inserted.id;
          status = "created";
        } else if (existingAssignment.roleId !== roleRecord.id) {
          const [updated] = await db
            .update(workspaceRoleAssignmentsTable)
            .set({
              roleId: roleRecord.id,
              updatedAt: new Date(),
            })
            .where(eq(workspaceRoleAssignmentsTable.id, existingAssignment.id))
            .returning({
              id: workspaceRoleAssignmentsTable.id,
            });
          assignmentId = updated.id;
          status = "updated";
        }

        if (!assignmentId) {
          throw createVisibleError(500, {
            message: "Failed to create or update workspace role assignment",
          });
        }

        const member: WorkspaceMember = {
          id: assignmentId,
          workspaceId,
          roleId: roleRecord.id,
          role: {
            id: roleRecord.id,
            slug: roleRecord.slug,
            name: roleRecord.name,
            description: roleRecord.description ?? undefined,
          },
          user: {
            id: existingUser.id,
            email: existingUser.email,
            firstName: existingUser.firstName ?? "",
            lastName: existingUser.lastName ?? "",
          },
        };

        await db
          .update(workspaceInvitesTable)
          .set({ status: "accepted", updatedAt: new Date() })
          .where(
            and(
              eq(workspaceInvitesTable.workspaceId, workspaceId),
              eq(workspaceInvitesTable.email, normalizedEmail),
            ),
          );

        return {
          status,
          member,
        };
      }

      if (hasPendingMembership) {
        const invitations = await workOS.userManagement.listInvitations({
          organizationId,
          email: normalizedEmail,
        });
        const existingInvitation = invitations.data.find(
          (invitation) => invitation.email.toLowerCase() === normalizedEmail,
        );

        if (existingInvitation && existingInvitation.state === "pending") {
          await db
            .insert(workspaceInvitesTable)
            .values({
              workspaceId,
              organizationId,
              roleId: roleRecord.id,
              invitationId: existingInvitation.id,
              inviterUserId: existingInvitation.inviterUserId ?? user.id,
              email: normalizedEmail,
              status: existingInvitation.state,
            })
            .onConflictDoUpdate({
              target: [
                workspaceInvitesTable.workspaceId,
                workspaceInvitesTable.email,
              ],
              set: {
                roleId: roleRecord.id,
                invitationId: existingInvitation.id,
                inviterUserId: existingInvitation.inviterUserId ?? user.id,
                status: existingInvitation.state,
                updatedAt: new Date(),
              },
            });

          return {
            status: "already_invited" as const,
            invitation: {
              id: existingInvitation.id,
              email: existingInvitation.email,
              state: existingInvitation.state,
              expiresAt: existingInvitation.expiresAt,
            },
          };
        }
      }
    }

    const invitations = await workOS.userManagement.listInvitations({
      organizationId,
      email: normalizedEmail,
    });
    const existingInvitation = invitations.data.find(
      (invitation) => invitation.email.toLowerCase() === normalizedEmail,
    );

    if (existingInvitation && existingInvitation.state === "pending") {
      await db
        .insert(workspaceInvitesTable)
        .values({
          workspaceId,
          organizationId,
          roleId: roleRecord.id,
          invitationId: existingInvitation.id,
          inviterUserId: existingInvitation.inviterUserId ?? user.id,
          email: normalizedEmail,
          status: existingInvitation.state,
        })
        .onConflictDoUpdate({
          target: [
            workspaceInvitesTable.workspaceId,
            workspaceInvitesTable.email,
          ],
          set: {
            roleId: roleRecord.id,
            invitationId: existingInvitation.id,
            inviterUserId: existingInvitation.inviterUserId ?? user.id,
            status: existingInvitation.state,
            updatedAt: new Date(),
          },
        });
      return {
        status: "already_invited" as const,
        invitation: {
          id: existingInvitation.id,
          email: existingInvitation.email,
          state: existingInvitation.state,
          expiresAt: existingInvitation.expiresAt,
        },
      };
    }

    const invitation = await workOS.userManagement.sendInvitation({
      email: normalizedEmail,
      organizationId,
      inviterUserId: user.id,
      roleSlug: ORGANIZATION_ROLE.MEMBER,
    });

    await db
      .insert(workspaceInvitesTable)
      .values({
        workspaceId,
        organizationId,
        roleId: roleRecord.id,
        invitationId: invitation.id,
        inviterUserId: user.id,
        email: normalizedEmail,
        status: invitation.state,
      })
      .onConflictDoUpdate({
        target: [
          workspaceInvitesTable.workspaceId,
          workspaceInvitesTable.email,
        ],
        set: {
          roleId: roleRecord.id,
          invitationId: invitation.id,
          inviterUserId: user.id,
          status: invitation.state,
          updatedAt: new Date(),
        },
      });

    return {
      status: "invited" as const,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        state: invitation.state,
        expiresAt: invitation.expiresAt,
      },
    };
  });

export const updateMemberRole = orpcBuilder
  .input(updateMemberRoleInput)
  .use(withWorkspaceRole, workspaceRoleMappers.admin)
  .handler(async ({ input }) => {
    const { memberId, role } = input;
    const actor = Actor.assert("workspace_user");
    const workspaceId = actor.properties.workspaceID;
    const db = getDbClient();
    const workOS = getWorkOS();

    // Check permission
    if (
      !hasWorkspacePermission(
        actor.properties.workspacePermissions,
        WORKSPACE_PERMISSION.TEAM_MANAGE_ROLES,
      )
    ) {
      throw createVisibleError(403, {
        message: "You don't have permission to manage team member roles",
      });
    }

    // Get the role record
    const [roleRecord] = await db
      .select({
        id: workspaceRolesTable.id,
        name: workspaceRolesTable.name,
        description: workspaceRolesTable.description,
        slug: workspaceRolesTable.slug,
      })
      .from(workspaceRolesTable)
      .where(eq(workspaceRolesTable.slug, role))
      .limit(1);

    if (!roleRecord) {
      throw createVisibleError(400, {
        message: `Workspace role ${role} not found`,
      });
    }

    // Get the member assignment
    const [assignment] = await db
      .select({
        id: workspaceRoleAssignmentsTable.id,
        assigneeId: workspaceRoleAssignmentsTable.assigneeId,
        roleId: workspaceRoleAssignmentsTable.roleId,
      })
      .from(workspaceRoleAssignmentsTable)
      .where(
        and(
          eq(workspaceRoleAssignmentsTable.id, memberId),
          eq(workspaceRoleAssignmentsTable.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    if (!assignment) {
      throw createVisibleError(404, {
        message: `Member ${memberId} not found`,
      });
    }

    // Don't allow users to change their own role
    if (assignment.assigneeId === actor.properties.userID) {
      throw createVisibleError(400, {
        message: "You cannot change your own role",
      });
    }

    // Update the role
    await db
      .update(workspaceRoleAssignmentsTable)
      .set({
        roleId: roleRecord.id,
        updatedAt: new Date(),
      })
      .where(eq(workspaceRoleAssignmentsTable.id, memberId));

    // Fetch updated member details
    const user = await workOS.userManagement.getUser(assignment.assigneeId);

    const member: WorkspaceMember = {
      id: memberId,
      workspaceId,
      roleId: roleRecord.id,
      role: {
        id: roleRecord.id,
        slug: roleRecord.slug,
        name: roleRecord.name,
        description: roleRecord.description ?? undefined,
      },
      user: {
        id: user.id,
        email: user.email ?? undefined,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
      },
    };

    return { member };
  });

export const removeMember = orpcBuilder
  .input(removeMemberInput)
  .use(withWorkspaceRole, workspaceRoleMappers.admin)
  .handler(async ({ input }) => {
    const { memberId } = input;
    const actor = Actor.assert("workspace_user");
    const workspaceId = actor.properties.workspaceID;
    const db = getDbClient();

    // Check permission
    if (
      !hasWorkspacePermission(
        actor.properties.workspacePermissions,
        WORKSPACE_PERMISSION.TEAM_REMOVE,
      )
    ) {
      throw createVisibleError(403, {
        message: "You don't have permission to remove team members",
      });
    }

    // Get the member assignment
    const [assignment] = await db
      .select({
        id: workspaceRoleAssignmentsTable.id,
        assigneeId: workspaceRoleAssignmentsTable.assigneeId,
      })
      .from(workspaceRoleAssignmentsTable)
      .where(
        and(
          eq(workspaceRoleAssignmentsTable.id, memberId),
          eq(workspaceRoleAssignmentsTable.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    if (!assignment) {
      throw createVisibleError(404, {
        message: `Member ${memberId} not found`,
      });
    }

    // Don't allow users to remove themselves
    if (assignment.assigneeId === actor.properties.userID) {
      throw createVisibleError(400, {
        message: "You cannot remove yourself from the workspace",
      });
    }

    // Delete the assignment
    await db
      .delete(workspaceRoleAssignmentsTable)
      .where(eq(workspaceRoleAssignmentsTable.id, memberId));

    return { success: true, memberId };
  });

export const revokeInvite = orpcBuilder
  .input(revokeInviteInput)
  .use(withWorkspaceRole, workspaceRoleMappers.admin)
  .handler(async ({ input }) => {
    const { inviteId } = input;
    const actor = Actor.assert("workspace_user");
    const workspaceId = actor.properties.workspaceID;
    const organizationId = actor.properties.organizationID;
    const db = getDbClient();
    const workOS = getWorkOS();

    // Check permission
    if (
      !hasWorkspacePermission(
        actor.properties.workspacePermissions,
        WORKSPACE_PERMISSION.TEAM_REMOVE,
      )
    ) {
      throw createVisibleError(403, {
        message: "You don't have permission to revoke invitations",
      });
    }

    const [invite] = await db
      .select({
        id: workspaceInvitesTable.id,
        invitationId: workspaceInvitesTable.invitationId,
        status: workspaceInvitesTable.status,
      })
      .from(workspaceInvitesTable)
      .where(
        and(
          eq(workspaceInvitesTable.id, inviteId),
          eq(workspaceInvitesTable.workspaceId, workspaceId),
          eq(workspaceInvitesTable.organizationId, organizationId),
        ),
      )
      .limit(1);

    if (!invite) {
      throw createVisibleError(404, {
        message: `Invite ${inviteId} not found`,
      });
    }

    if (invite.status !== "pending") {
      throw createVisibleError(400, {
        message: "Only pending invites can be revoked",
      });
    }

    try {
      await workOS.userManagement.revokeInvitation(invite.invitationId);
    } catch (error) {
      console.error("Failed to revoke WorkOS invitation", error);
    }

    await db
      .update(workspaceInvitesTable)
      .set({ status: "revoked", updatedAt: new Date() })
      .where(eq(workspaceInvitesTable.id, inviteId));

    return {
      status: "revoked" as const,
      inviteId,
    };
  });

// ============================================================================
// Router Export
// ============================================================================

export const teamRouter = orpcBuilder.router({
  list: listTeam,
  invite: inviteMember,
  updateRole: updateMemberRole,
  remove: removeMember,
  revokeInvite: revokeInvite,
});

export type TeamRouterInputs = InferRouterInputs<typeof teamRouter>;
export type TeamRouterOutputs = InferRouterOutputs<typeof teamRouter>;
