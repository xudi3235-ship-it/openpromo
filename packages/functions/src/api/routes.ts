import { Log } from "@openpromo/core/util/log";
import type { User as WorkosUser } from "@workos-inc/node";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { noCache } from "./middleware/no-cache";
import { workosAuth } from "./middleware/workos-auth";
import { Auth } from "./routes/auth";
import { Ping } from "./routes/ping";
import { UserRoutes } from "./routes/user";
import { Workspace } from "./routes/workspace";

const log = Log.create({ namespace: "api" });

export type User = WorkosUser;
export type MyEnv = {
  Variables: {
    user: User | undefined;
  };
};

export const app = new Hono<MyEnv>()
  .use(logger())
  .use(noCache())
  .use(workosAuth())
  .get("/", (c) => {
    log.info("Received request at root endpoint");
    return c.text("you just hit our api lol");
  })
  .route("/ping", Ping.route)
  .route("/workspaces", Workspace.route)
  .route("/user", UserRoutes.route)
  .route("/auth", Auth.route);

export type Routes = typeof app;
