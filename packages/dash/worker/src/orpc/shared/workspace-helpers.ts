import { WORKSPACE_ROLE, type WorkspaceRole } from "@shared/workspace/auth";
import * as z from "zod";

/**
 * Common base schema for workspace-scoped operations
 * Include this in your input schemas when you need workspace context
 */
export const WorkspaceIdentifierSchema = z.object({
  workspaceId: z.string().min(1).optional(),
  workspaceSlug: z.string().min(1).optional(),
});

export type WorkspaceIdentifier = z.infer<typeof WorkspaceIdentifierSchema>;

/**
 * Helper to create workspace input mapper for middleware
 * Use this with withWorkspaceRole middleware
 */
export function createWorkspaceRoleMapper(requiredRole: WorkspaceRole) {
  return (input: WorkspaceIdentifier) => ({
    requiredRole,
    workspaceId: input.workspaceId,
    workspaceSlug: input.workspaceSlug,
  });
}

/**
 * Common workspace role mappers for quick reuse
 * Automatically generated from WORKSPACE_ROLE
 */
export const workspaceRoleMappers = Object.fromEntries(
  Object.entries(WORKSPACE_ROLE).map(([key, value]) => [
    key.toLowerCase(),
    createWorkspaceRoleMapper(value),
  ]),
) as Record<
  Lowercase<keyof typeof WORKSPACE_ROLE>,
  ReturnType<typeof createWorkspaceRoleMapper>
>;

/**
 * Helper to create a workspace-scoped input schema
 * Extends WorkspaceIdentifierSchema with your custom schema
 */
export function createWorkspaceInputSchema<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
) {
  return WorkspaceIdentifierSchema.extend(schema.shape);
}
