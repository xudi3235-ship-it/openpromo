import { VisibleError } from "@core/utils/error";
import { Actor } from "@openpromo/core/helpers/actor";
import type { ApiEnv } from "@openpromo/core/helpers/api-env";
import {
  hasAllWorkspacePermissions,
  hasAnyWorkspacePermission,
  hasWorkspacePermission,
  type WorkspacePermission,
} from "@shared/workspace/auth";
import type { Context } from "hono";
import type { MiddlewareHandler } from "hono/types";
import { createVisibleError } from "../helpers/error";

/**
 * Middleware to check if the user has a specific workspace permission
 * Must be used after withWorkspaceRole middleware to ensure workspace context is set
 *
 * @param requiredPermission - The required workspace permission
 */
export const withWorkspacePermission: (
  requiredPermission: WorkspacePermission,
) => MiddlewareHandler =
  (requiredPermission) => async (_c: Context<ApiEnv>, next) => {
    try {
      const actor = Actor.assert("workspace_user");
      const permissions = actor.properties.workspacePermissions;

      if (!hasWorkspacePermission(permissions, requiredPermission)) {
        throw createVisibleError(403, {
          message: `Missing required workspace permission: ${requiredPermission}`,
        });
      }

      return next();
    } catch (error) {
      if (error instanceof VisibleError) {
        throw error;
      }
      throw createVisibleError(403, {
        message: "No workspace context found. Use withWorkspaceRole first.",
      });
    }
  };

/**
 * Middleware to check if the user has ANY of the specified workspace permissions
 * Must be used after withWorkspaceRole middleware
 *
 * @param requiredPermissions - Array of workspace permissions (user needs at least one)
 */
export const withAnyWorkspacePermission: (
  requiredPermissions: WorkspacePermission[],
) => MiddlewareHandler =
  (requiredPermissions) => async (_c: Context<ApiEnv>, next) => {
    try {
      const actor = Actor.assert("workspace_user");
      const permissions = actor.properties.workspacePermissions;

      if (!hasAnyWorkspacePermission(permissions, requiredPermissions)) {
        throw createVisibleError(403, {
          message: `Missing required workspace permissions. Need one of: ${requiredPermissions.join(", ")}`,
        });
      }

      return next();
    } catch (error) {
      if (error instanceof VisibleError) {
        throw error;
      }
      throw createVisibleError(403, {
        message: "No workspace context found. Use withWorkspaceRole first.",
      });
    }
  };

/**
 * Middleware to check if the user has ALL of the specified workspace permissions
 * Must be used after withWorkspaceRole middleware
 *
 * @param requiredPermissions - Array of workspace permissions (user needs all)
 */
export const withAllWorkspacePermissions: (
  requiredPermissions: WorkspacePermission[],
) => MiddlewareHandler =
  (requiredPermissions) => async (_c: Context<ApiEnv>, next) => {
    try {
      const actor = Actor.assert("workspace_user");
      const permissions = actor.properties.workspacePermissions;

      if (!hasAllWorkspacePermissions(permissions, requiredPermissions)) {
        throw createVisibleError(403, {
          message: `Missing required workspace permissions: ${requiredPermissions.join(", ")}`,
        });
      }

      return next();
    } catch (error) {
      if (error instanceof VisibleError) {
        throw error;
      }
      throw createVisibleError(403, {
        message: "No workspace context found. Use withWorkspaceRole first.",
      });
    }
  };
