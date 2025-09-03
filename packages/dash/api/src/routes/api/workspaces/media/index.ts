import { Hono } from "hono";
import type { ApiEnv } from "../../../../types";
import { imagesRoute } from "./images.js";

export const mediaRoute = new Hono<ApiEnv>().route("/images", imagesRoute);
