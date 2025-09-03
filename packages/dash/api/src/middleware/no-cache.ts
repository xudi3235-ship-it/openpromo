import type { MiddlewareHandler } from "hono/types";

export const noCache = (): MiddlewareHandler => async (c, next) => {
  c.header("Cache-Control", "no-store");
  return next();
};
