import type { MiddlewareHandler } from "hono/types";

export const cfMetadata = (): MiddlewareHandler => async (c, next) => {
  if (c.env.DEBUG === "ON") {
    console.log("Cloudflare metadata", c.req.raw.cf);
  }
  return next();
};
