import type { ApiEnv } from "@openpromo/core/helpers/api-env";
import type { OrganizationRole } from "@shared/workspace/auth";
import type { Context } from "hono";
import type { MiddlewareHandler } from "hono/types";
import { createVisibleError } from "../helpers/error";
import { hasOrgRole } from "../helpers/role";

export const withOrgRole: (
  requiredRole: OrganizationRole,
) => MiddlewareHandler = (requiredRole) => async (c: Context<ApiEnv>, next) => {
  const role = c.get("role");
  if (!hasOrgRole(role, requiredRole)) {
    throw createVisibleError(403, {
      message: `Insufficient organization permissions. User role: ${role}, Required role: ${requiredRole}.`,
    });
  }

  return next();
};
