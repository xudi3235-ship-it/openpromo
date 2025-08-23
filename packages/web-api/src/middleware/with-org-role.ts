import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { MiddlewareHandler } from "hono/types";
import type { OrganizationRole } from "../constants/auth";
import { hasOrgRole } from "../helpers/role";
import type { ApiEnv } from "../types";

export const withOrgRole: (
  requiredRole: OrganizationRole,
) => MiddlewareHandler = (requiredRole) => async (c: Context<ApiEnv>, next) => {
  if (!hasOrgRole(c.get("role"), requiredRole)) {
    throw new HTTPException(403);
  }

  return next();
};
