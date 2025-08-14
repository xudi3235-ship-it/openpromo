import { Hono } from "hono";
import type { ApiEnv } from "@/types";

export const pingRoute = new Hono<ApiEnv>().get("/", (c) => {
  const _conn = c.env.HYPERDRIVE.connectionString;
  // do something with db
  return c.json({ message: "pong" });
});
