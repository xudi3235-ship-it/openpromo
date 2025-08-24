import type { Context } from "hono";
import type { MiddlewareHandler } from "hono/types";
import type { OrganizationRole } from "../constants/auth";
import { AppError } from "../helpers/error";
import { hasOrgRole } from "../helpers/role";
import type { ApiEnv } from "../types";

export const withOrgRole: (
  requiredRole: OrganizationRole,
) => MiddlewareHandler = (requiredRole) => async (c: Context<ApiEnv>, next) => {
  const role = c.get("role");
  if (!hasOrgRole(role, requiredRole)) {
    throw new AppError(403, {
      message: `Insufficient organization permissions. User role: ${role}, Required role: ${requiredRole}.`,
    });
  }

  return next();
};
