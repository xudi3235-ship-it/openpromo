import { Hono } from "hono";
import type { EnvWithUser } from "@/types";
import { meRoute } from "./me";

export const usersRoute = new Hono<EnvWithUser>().route("/me", meRoute);
