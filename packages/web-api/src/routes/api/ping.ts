import { Hono } from "hono";
import type { MyEnv } from "@/types";

export const pingRoute = new Hono<MyEnv>().get("/", (c) => {
  return c.json({ message: "pong" });
});
