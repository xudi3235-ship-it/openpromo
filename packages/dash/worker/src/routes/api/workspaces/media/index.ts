import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import { imagesRoute } from "./images.js";

export const mediaRoute = new Hono<ApiEnv>().route("/images", imagesRoute);
