import { Hono } from "hono";
import { callbackRoute } from "./callback";
import { loginRoute } from "./login";
import { logoutRoute } from "./logout";
import { magicAuthRoute } from "./magic-auth";

export const authRoutes = new Hono()
  .route("/login", loginRoute)
  .route("/logout", logoutRoute)
  .route("/callback", callbackRoute)
  .route("/magic-auth", magicAuthRoute);
