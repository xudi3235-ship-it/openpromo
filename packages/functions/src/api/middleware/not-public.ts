import { HTTPException } from "hono/http-exception";
import type { MiddlewareHandler } from "hono/types";

export const notPublic: () => MiddlewareHandler = () => async (c, next) => {
  const user = c.get("user");
  if (!user) {
    throw new HTTPException(401);
  }

  return next();
};
