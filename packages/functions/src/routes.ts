import { Log } from "@openpromo/core/util/log";
import { Hono } from "hono";
import { Ping } from "./ping";

const log = Log.create({ namespace: "api" });

export const app = new Hono();

export const routes = app.route("/ping", Ping.route);

app.get("/", (c) => {
  log.info("Received request at root endpoint");
  return c.text("you just hit our api lol");
});
