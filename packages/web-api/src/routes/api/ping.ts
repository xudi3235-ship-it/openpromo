import { Hono } from "hono";
import { ping } from "../../generated/api/sdk.gen";
import type { ApiEnv } from "../../types";

export const pingRoute = new Hono<ApiEnv>().get("/", async (c) => {
  const conn = c.env.HYPERDRIVE.connectionString;
  const message = conn ? "pong" : "no connection";
  // example usage, calling our api
  const p = await ping();
  console.log(p);
  return c.json({ message });
});
