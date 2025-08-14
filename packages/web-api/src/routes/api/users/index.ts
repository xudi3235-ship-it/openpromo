import { Hono } from "hono";
import type { ApiEnv } from "@/types";
import { meRoute } from "./me";

export const usersRoute = new Hono<ApiEnv>().route("/me", meRoute);
