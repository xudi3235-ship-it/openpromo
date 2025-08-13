import { Hono } from "hono";
import type { MyEnv } from "@/types";
import { pingRoute } from "./ping";
import { usersRoute } from "./users";

export const apiRoutes = new Hono<MyEnv>()
  .route("/ping", pingRoute)
  .route("/users", usersRoute);
