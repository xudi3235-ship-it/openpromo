import type { ApiEnv } from "@openpromo/core/actors/index";
import { env } from "@openpromo/core/env/index";
import type { Context, MiddlewareHandler } from "hono";
import { AppError } from "../helpers/error";

export const withAuth: () => MiddlewareHandler =
  () => async (c: Context<ApiEnv>, next) => {
    const user = c.get("user");
    const hasAdminApiToken = checkAdminApiToken(c);
    if (!user && !hasAdminApiToken) {
      throw new AppError(401);
    }

    return next();
  };

function checkAdminApiToken(c: Context<ApiEnv>): boolean {
  const authorization = c.req.header("Authorization");
  const parts = authorization?.split(" ");
  if (parts?.length !== 2) {
    return false;
  }
  const bearerToken = parts[1];
  if (bearerToken !== env.ADMIN_API_TOKEN) {
    return false;
  }
  return true;
}
