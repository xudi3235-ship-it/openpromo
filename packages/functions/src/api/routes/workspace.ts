import { Hono } from "hono";

export namespace Workspace {
  export const route = new Hono().get("/", async (ctx) => {
    return ctx.json({ message: "workspace endpoint" });
  });
}
