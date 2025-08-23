import { Hono } from "hono";
import type { ApiEnv } from "../../types";

export const pingRoute = new Hono<ApiEnv>().get("/", (c) => {
  const conn = c.env.HYPERDRIVE.connectionString;
  const message = conn ? "pong" : "no connection";
  return c.json({ message });
});
