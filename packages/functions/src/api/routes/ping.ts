import { Hono } from "hono";
import type { MyEnv } from "../routes";

export namespace Ping {
  export const route = new Hono<MyEnv>().get("/", async (ctx) => {
    return ctx.json({ message: "pong" });
  });
}
