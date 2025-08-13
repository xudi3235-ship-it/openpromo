import { Hono } from "hono";
import type { MyEnv } from "@/types";
import { callbackRoute } from "./callback";
import { loginRoute } from "./login";
import { logoutRoute } from "./logout";

export const authRoutes = new Hono<MyEnv>()
  .route("/login", loginRoute)
  .route("/logout", logoutRoute)
  .route("/callback", callbackRoute);
