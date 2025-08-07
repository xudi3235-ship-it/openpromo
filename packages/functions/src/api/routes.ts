import { Log } from "@openpromo/core/util/log";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { jwtAuth } from "./middleware/jwt-auth";
import { noCache } from "./middleware/no-cache";
import { Ping } from "./routes/ping";
import { UserRoutes } from "./routes/user";
import { Workspace } from "./routes/workspace";

const log = Log.create({ namespace: "api" });

export const app = new Hono()
  .use(logger())
  .use(noCache())
  .use(jwtAuth())
  .get("/", (c) => {
    log.info("Received request at root endpoint");
    return c.text("you just hit our api lol");
  })
  .route("/ping", Ping.route)
  .route("/workspace", Workspace.route)
  .route("/user", UserRoutes.route);

export type Routes = typeof app;
