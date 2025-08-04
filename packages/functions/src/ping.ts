import { Hono } from "hono";

export namespace Ping {
  export const route = new Hono().get("/", async (ctx) => {
    return ctx.json({ message: "pong" });
  });
}
