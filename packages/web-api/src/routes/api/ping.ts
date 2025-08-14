import { Hono } from "hono";
import type { EnvWithUser } from "@/types";

export const pingRoute = new Hono<EnvWithUser>().get("/", (c) => {
  return c.json({ message: "pong" });
});
