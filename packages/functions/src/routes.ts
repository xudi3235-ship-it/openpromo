import { ErrorCodes, VisibleError } from "@openpromo/core/error";
import { Log } from "@openpromo/core/util/log";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { auth } from "./auth/index";
import { Ping } from "./ping";

const log = Log.create({ namespace: "api" });

export const app = new Hono();

// User authentication handler
app.on(["POST", "GET"], "/api/auth/**", async (c) => {
  return auth.fetch(c.req.raw);
});

app.use(logger()).use(async (c, next) => {
  c.header("Cache-Control", "no-store");
  return next();
});
// TODO: handle more middlewares, e.g. auth, cors, etc

export const routes = app.route("/ping", Ping.route).onError((error, c) => {
  // Handle our custom VisibleError
  if (error instanceof VisibleError) {
    // @ts-expect-error
    return c.json(error.toResponse(), error.statusCode());
  }

  // Handle HTTP exceptions
  if (error instanceof HTTPException) {
    console.error("http error:", error);
    return c.json(
      {
        type: "validation",
        code: ErrorCodes.Validation.INVALID_PARAMETER,
        message: "Invalid request",
      },
      400,
    );
  }

  // Handle any other errors as internal server errors
  console.error("unhandled error:", error);
  return c.json(
    {
      type: "internal",
      code: ErrorCodes.Server.INTERNAL_ERROR,
      message: "Internal server error",
    },
    500,
  );
});

app.get("/", (c) => {
  log.info("Received request at root endpoint");
  return c.text("you just hit our api lol");
});
