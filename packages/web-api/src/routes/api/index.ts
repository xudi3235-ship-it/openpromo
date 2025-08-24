import { ErrorCodes, VisibleError } from "@openpromo/core/error";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { workOSAuth } from "../../middleware/workos-auth";
import type { ApiEnv } from "../../types";
import { orgsRoute } from "./orgs";
import { pingRoute } from "./ping";
import { usersRoute } from "./users";
import { workspacesRoute } from "./workspaces";

export const apiRoutes = new Hono<ApiEnv>()
  .use(workOSAuth())
  .route("/ping", pingRoute)
  .route("/users", usersRoute)
  .route("/workspaces", workspacesRoute)
  .route("/orgs", orgsRoute)
  .onError((error, c) => {
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
