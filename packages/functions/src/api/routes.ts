import { Log } from "@openpromo/core/util/log";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { noCache } from "./middleware/no-cache";
import { Ping } from "./ping";

const log = Log.create({ namespace: "api" });

export const app = new Hono()
  .get("/", (c) => {
    log.info("Received request at root endpoint");
    return c.text("you just hit our api lol");
  })
  .route("/ping", Ping.route);

app.use(logger()).use(noCache());

export type Routes = typeof app;
