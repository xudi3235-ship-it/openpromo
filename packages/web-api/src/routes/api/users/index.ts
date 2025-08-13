import { Hono } from "hono";
import type { MyEnv } from "@/types";
import { meRoute } from "./me";

export const usersRoute = new Hono<MyEnv>().route("/me", meRoute);
