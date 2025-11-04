import { getDbClient } from "@core/database/db";
import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { getWorkOS } from "@core/providers/workos";
import { workspaceInvitesTable } from "@core/schemas/workspace-invites.sql";
import { workspaceRoleAssignmentsTable } from "@core/schemas/workspace-role-assignments.sql";
import { workspaceRolesTable } from "@core/schemas/workspace-roles.sql";
import { workspacesTable } from "@core/schemas/workspaces.sql";
import {
  ORGANIZATION_ROLE,
  WORKSPACE_PERMISSION,
  WORKSPACE_ROLE,
} from "@shared/workspace/auth";
import type { User } from "@workos-inc/node";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import * as z from "zod";
import { assertUser } from "../../../helpers/auth";
import { createVisibleError } from "../../../helpers/error";
import { withAuth } from "../../../middleware/with-auth";
import { withWorkspacePermission } from "../../../middleware/with-workspace-permission";
import { withWorkspaceRole } from "../../../middleware/with-workspace-role";
import { zValidator } from "../../../middleware/zod-validator";

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

type InvitationSummary = {
  id: string;
  email: string;
  state: string;
  expiresAt: string;
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

export type WorkspaceTeamResponse = {
  members: WorkspaceMember[];
  invites: WorkspaceInviteSummary[];
};

export type WorkspaceTeamInviteResponse =
  | {
      status: "created" | "updated" | "unchanged";
      member: WorkspaceMember;
    }
  | {
      status: "invited" | "already_invited";
      invitation: InvitationSummary;
    };

export type WorkspaceTeamInviteRevokeResponse = {
  status: "revoked";
  inviteId: string;
};

const inviteMemberSchema = z.object({
  email: z.string().email().trim(),
  role: z
    .enum([WORKSPACE_ROLE.ADMIN, WORKSPACE_ROLE.EDITOR, WORKSPACE_ROLE.VIEWER])
    .default(WORKSPACE_ROLE.VIEWER),
});

export const workspaceTeamRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .use(withWorkspaceRole(WORKSPACE_ROLE.VIEWER))
  .get(
    "/",
    withWorkspacePermission(WORKSPACE_PERMISSION.TEAM_VIEW),
    async (ctx) => {
      const workspaceSlug = ctx.req.param("workspaceSlug");
      if (!workspaceSlug)
        throw createVisibleError(400, {
          message: "Workspace slug is required",
        });
      const db = getDbClient();
      const workOS = getWorkOS();
      const actor = Actor.assert("workspace_user");
      const workspaceId = actor.properties.workspaceID;

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
      // fetch user details from WorkOS
      const members = await Promise.all(
        assignments.map(async (assignment) => {
          const user = await workOS.userManagement.getUser(
            assignment.assigneeId,
          );
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
        .innerJoin(
          workspacesTable,
          eq(workspaceInvitesTable.workspaceId, workspacesTable.id),
        )
        .where(
          and(
            eq(workspaceInvitesTable.workspaceId, workspaceId),
            eq(workspaceInvitesTable.status, "pending"),
          ),
        );

      const inviteSummaries: WorkspaceInviteSummary[] = invites.map(
        (invite) => ({
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
        }),
      );

      return ctx.json<WorkspaceTeamResponse>({
        members,
        invites: inviteSummaries,
      });
    },
  )
  .post(
    "/",
    zValidator("json", inviteMemberSchema),
    withWorkspaceRole(WORKSPACE_ROLE.ADMIN),
    withWorkspacePermission(WORKSPACE_PERMISSION.TEAM_INVITE),
    async (ctx) => {
      const { email, role } = ctx.req.valid("json");
      const normalizedEmail = email.toLowerCase();

      const db = getDbClient();
      const workOS = getWorkOS();
      const actor = Actor.assert("workspace_user");
      const user = assertUser(ctx);

      const workspaceId = actor.properties.workspaceID;
      const organizationId = actor.properties.organizationID;

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
              .where(
                eq(workspaceRoleAssignmentsTable.id, existingAssignment.id),
              )
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

          return ctx.json<WorkspaceTeamInviteResponse>(
            {
              status,
              member,
            },
            status === "created" ? 201 : 200,
          );
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

            return ctx.json<WorkspaceTeamInviteResponse>(
              {
                status: "already_invited",
                invitation: {
                  id: existingInvitation.id,
                  email: existingInvitation.email,
                  state: existingInvitation.state,
                  expiresAt: existingInvitation.expiresAt,
                },
              },
              200,
            );
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
        return ctx.json<WorkspaceTeamInviteResponse>(
          {
            status: "already_invited",
            invitation: {
              id: existingInvitation.id,
              email: existingInvitation.email,
              state: existingInvitation.state,
              expiresAt: existingInvitation.expiresAt,
            },
          },
          200,
        );
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

      return ctx.json<WorkspaceTeamInviteResponse>(
        {
          status: "invited",
          invitation: {
            id: invitation.id,
            email: invitation.email,
            state: invitation.state,
            expiresAt: invitation.expiresAt,
          },
        },
        202,
      );
    },
  )
  .patch(
    "/members/:memberId",
    zValidator("param", z.object({ memberId: z.string() })),
    zValidator(
      "json",
      z.object({
        role: z.enum([
          WORKSPACE_ROLE.ADMIN,
          WORKSPACE_ROLE.EDITOR,
          WORKSPACE_ROLE.VIEWER,
        ]),
      }),
    ),
    withWorkspaceRole(WORKSPACE_ROLE.ADMIN),
    withWorkspacePermission(WORKSPACE_PERMISSION.TEAM_MANAGE_ROLES),
    async (ctx) => {
      const { memberId } = ctx.req.valid("param");
      const { role } = ctx.req.valid("json");
      const actor = Actor.assert("workspace_user");
      const workspaceId = actor.properties.workspaceID;
      const db = getDbClient();
      const workOS = getWorkOS();

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

      return ctx.json({ member });
    },
  )
  .delete(
    "/members/:memberId",
    zValidator("param", z.object({ memberId: z.string() })),
    withWorkspaceRole(WORKSPACE_ROLE.ADMIN),
    withWorkspacePermission(WORKSPACE_PERMISSION.TEAM_REMOVE),
    async (ctx) => {
      const { memberId } = ctx.req.valid("param");
      const actor = Actor.assert("workspace_user");
      const workspaceId = actor.properties.workspaceID;
      const db = getDbClient();

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

      return ctx.json({ success: true, memberId });
    },
  )
  .delete(
    "/invites/:inviteId",
    zValidator("param", z.object({ inviteId: z.string() })),
    withWorkspaceRole(WORKSPACE_ROLE.ADMIN),
    withWorkspacePermission(WORKSPACE_PERMISSION.TEAM_REMOVE),
    async (ctx) => {
      const { inviteId } = ctx.req.valid("param");
      const actor = Actor.assert("workspace_user");
      const workspaceId = actor.properties.workspaceID;
      const organizationId = actor.properties.organizationID;
      const db = getDbClient();
      const workOS = getWorkOS();

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

      return ctx.json<WorkspaceTeamInviteRevokeResponse>({
        status: "revoked",
        inviteId,
      });
    },
  );

export type WorkspaceTeamMemberUpdateResponse = {
  member: WorkspaceMember;
};

export type WorkspaceTeamMemberRemoveResponse = {
  success: boolean;
  memberId: string;
};
