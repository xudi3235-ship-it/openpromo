import { Hono } from "hono";
import { workOSAuth } from "@/middleware/workos-auth";
import type { EnvWithUser } from "@/types";
import { pingRoute } from "./ping";
import { usersRoute } from "./users";

export const apiRoutes = new Hono<EnvWithUser>()
  .use(workOSAuth())
  .route("/ping", pingRoute)
  .route("/users", usersRoute);
